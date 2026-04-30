import { create } from "apisauce";

import authStorage from "@/auth/storage";

const apiClient = create({
  baseURL: `${import.meta.env.VITE_WEBSITE_URL}/api`,
});

apiClient.addAsyncRequestTransform(async (request) => {
  const token = authStorage.getToken();
  if (token) request.headers['x-auth-token'] = token;
});

apiClient.addAsyncResponseTransform(async (response, b) => {
  if(response.status === 401) {
    authStorage.removeToken();
    localStorage.removeItem("myket-ai-user");
    window.location.href = "/";
  }
});


export default apiClient;
