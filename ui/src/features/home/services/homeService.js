import apiClient from "@/lib/apiClient";

export const homeService = {
  getHome: () => apiClient.get("/home"),
};
