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
];

function isSilent(url) {
  return SILENT_PATTERNS.some((p) => p.test(url ?? ""));
}

apiClient.addAsyncRequestTransform(async (request) => {
  const token = authStorage.getToken();
  if (token) request.headers['x-auth-token'] = token;
  const silent = isSilent(request.url);
  request.headers['x-silent'] = silent ? '1' : '0';
  if (!silent) loadingBus.increment();
});

apiClient.addAsyncResponseTransform(async (response) => {
  const silent = response.config?.headers?.['x-silent'] === '1';
  if (!silent) loadingBus.decrement();
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
