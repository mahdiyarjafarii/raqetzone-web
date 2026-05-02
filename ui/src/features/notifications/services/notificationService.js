import apiClient from "@/lib/apiClient";

export const notificationService = {
  getAll: (limit = 50) => apiClient.get("/notifications", { limit }),
  getUnreadCount: () => apiClient.get("/notifications/unread-count"),
  markRead: (id) => apiClient.patch(`/notifications/${id}/read`),
  markAllRead: () => apiClient.patch("/notifications/read-all"),
  delete: (id) => apiClient.delete(`/notifications/${id}`),

  // Admin / System
  send: (payload) => apiClient.post("/notifications/send", payload),
  broadcast: (payload) => apiClient.post("/notifications/broadcast", payload),
};
