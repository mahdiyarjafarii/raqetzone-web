import { create } from "apisauce";

import authStorage from "@/auth/storage";
import { loadingBus } from "@/lib/loadingBus";

const apiClient = create({
  baseURL: `${import.meta.env.VITE_WEBSITE_URL}/api`,
});

const SILENT_PATTERNS = [
  /\/notifications/,
  /\/wallet/,
  /\/home/,
  /\/ranking/,
  /socket\.io/,
];

function isSilent(url) {
  return SILENT_PATTERNS.some((p) => p.test(url ?? ""));
}

apiClient.addAsyncRequestTransform(async (request) => {
  const token = authStorage.getToken();
  if (token) request.headers['x-auth-token'] = token;
  if (!isSilent(request.url)) loadingBus.increment();
});

apiClient.addAsyncResponseTransform(async (response) => {
  if (!isSilent(response.config?.url)) loadingBus.decrement();
});

apiClient.addAsyncResponseTransform(async (response, b) => {
  if(response.status === 401) {
    authStorage.removeToken();
    localStorage.removeItem("myket-ai-user");
    window.location.href = "/";
  }

  if (response.status === 403 && response.data?.code === "PROFILE_INCOMPLETE") {
    window.dispatchEvent(new CustomEvent("raqetzone:profile-incomplete", {
      detail: {
        missingFields: response.data?.missingFields ?? [],
      },
    }));
  }
});


export default apiClient;
