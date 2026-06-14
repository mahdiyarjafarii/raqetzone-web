import apiClient from "@/lib/apiClient";

export const gameService = {
  getTennisDuelOverview: () => apiClient.get("/games/tennis-duel"),
  getTennisDuelHistory: () => apiClient.get("/games/tennis-duel/history"),
  startTennisDuel: () => apiClient.post("/games/tennis-duel/start"),
  submitTennisDuel: (sessionId, payload) =>
    apiClient.post(`/games/tennis-duel/${sessionId}/submit`, payload),
};
