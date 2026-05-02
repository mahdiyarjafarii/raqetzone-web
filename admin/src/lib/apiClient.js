import { create } from "apisauce";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";

const apiClient = create({ baseURL: BASE });

apiClient.addAsyncRequestTransform(async (req) => {
  const token = localStorage.getItem("raqetzone-admin-token");
  if (token) req.headers["x-auth-token"] = token;
});

apiClient.addAsyncResponseTransform(async (res) => {
  if (res.status === 401) {
    localStorage.removeItem("raqetzone-admin-token");
    window.location.href = "/login";
  }
});

export default apiClient;
