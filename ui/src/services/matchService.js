import apiClient from "@/lib/apiClient";

export const matchService = {
  getMatches: (params = {}) => apiClient.get("/matches", params),
  getMatch: (id) => apiClient.get(`/matches/${id}`),
  joinMatch: (id, team) => apiClient.post(`/matches/${id}/join`, { team }),
  leaveMatch: (id) => apiClient.delete(`/matches/${id}/leave`),
  finalizeMatch: (id, didPlay) => apiClient.patch(`/matches/${id}/finalize`, { didPlay }),
  getMatchResult: (id) => apiClient.get(`/matches/${id}/result`),
  submitMatchResult: (id, sets) => apiClient.post(`/matches/${id}/result`, { sets }),
  voteMatchResult: (id, vote) => apiClient.post(`/matches/${id}/result/vote`, { vote }),
  deleteMatch: (id) => apiClient.delete(`/matches/${id}`),
  createMatch: (data) => apiClient.post("/matches", data),
  getInviteLink: (id) => apiClient.get(`/matches/${id}/invite`),
  emergencySub: (id) => apiClient.post(`/matches/${id}/emergency-sub`),
  rateMatch: (id, ratings) => apiClient.post(`/matches/${id}/rate`, { ratings }),
  getCompatibility: (id) => apiClient.get(`/matches/${id}/compatibility`),
  getMatchByToken: (token) => apiClient.get(`/public/matches/invite/${token}`),
};
