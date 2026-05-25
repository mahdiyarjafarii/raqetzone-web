import apiClient from "@/lib/apiClient";

export const tournamentService = {
  getTournaments: (params = {}) => apiClient.get("/tournaments", params),
  getTournament: (id) => apiClient.get(`/tournaments/${id}`),
  createTournament: (data) => apiClient.post("/tournaments", data),
  updateTournament: (id, data) => apiClient.patch(`/tournaments/${id}`, data),
  register: (id) => apiClient.post(`/tournaments/${id}/register`),
  unregister: (id) => apiClient.delete(`/tournaments/${id}/register`),
  getParticipants: (id) => apiClient.get(`/tournaments/${id}/participants`),
  getClubTournaments: (clubId) => apiClient.get(`/clubs/${clubId}/tournaments`),
};
