import apiClient from "@/lib/apiClient";

export const matchService = {
  getMatches: (params = {}) => apiClient.get("/matches", params),
  getMatch: (id) => apiClient.get(`/matches/${id}`),
  joinMatch: (id, team) => apiClient.post(`/matches/${id}/join`, { team }),
  leaveMatch: (id) => apiClient.delete(`/matches/${id}/leave`),
  deleteMatch: (id) => apiClient.delete(`/matches/${id}`),
  createMatch: (data) => apiClient.post("/matches", data),
  getInviteLink: (id) => apiClient.get(`/matches/${id}/invite`),
  emergencySub: (id) => apiClient.post(`/matches/${id}/emergency-sub`),
  rateMatch: (id, ratings) => apiClient.post(`/matches/${id}/rate`, { ratings }),
  getCompatibility: (id) => apiClient.get(`/matches/${id}/compatibility`),
  getMatchByToken: (token) => apiClient.get(`/public/matches/invite/${token}`),
};
