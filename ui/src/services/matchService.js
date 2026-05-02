import apiClient from "@/lib/apiClient";

export const matchService = {
  getMatches: (params = {}) => apiClient.get("/matches", params),
  getMatch: (id) => apiClient.get(`/matches/${id}`),
  joinMatch: (id, team) => apiClient.post(`/matches/${id}/join`, { team }),
  leaveMatch: (id) => apiClient.delete(`/matches/${id}/leave`),
  createMatch: (data) => apiClient.post("/matches", data),
};
