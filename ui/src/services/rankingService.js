import apiClient from "@/lib/apiClient";

export const rankingService = {
  getLeaderboard: (params = {}) => apiClient.get("/rankings/leaderboard", params),
};
