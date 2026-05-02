import apiClient from "@/lib/apiClient";

export const bookingService = {
  getCourts: () => apiClient.get("/courts"),
  getCourt: (id) => apiClient.get(`/courts/${id}`),
  getAvailability: (courtId, date) =>
    apiClient.get(`/courts/${courtId}/availability`, { date }),

  createBooking: (data) => apiClient.post("/bookings", data),
  getMyBookings: () => apiClient.get("/bookings/my"),
  cancelBooking: (id) => apiClient.patch(`/bookings/${id}/cancel`),

  // Admin
  getAdminBookings: (status) =>
    apiClient.get("/admin/bookings", status ? { status } : {}),
  updateBookingStatus: (id, status, adminNote) =>
    apiClient.patch(`/admin/bookings/${id}`, { status, adminNote }),
};
