import apiClient from "@/lib/apiClient";

export const rankingService = {
  getLeaderboard: (params = {}) => apiClient.get("/rankings/leaderboard", params),
  getMonthlyHistory: (params = {}) => apiClient.get("/rankings/history", params),
  getActivePeriods: (params = {}) => apiClient.get("/rankings/periods", params),
};
