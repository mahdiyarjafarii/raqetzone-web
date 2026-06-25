import apiClient from "@/lib/apiClient";

export const coachService = {
  getCoaches: () => apiClient.get("/coaches"),
  getAllClasses: () => apiClient.get("/classes"),
  getClassesByClub: async (clubId) => {
    const { ok, data } = await apiClient.get("/classes");
    const all = ok && Array.isArray(data?.classes) ? data.classes : [];
    return all.filter((cls) =>
      Array.isArray(cls.sessions) && cls.sessions.some((s) => s.clubId === clubId)
    );
  },
  getMyClasses: () => apiClient.get("/coaches/me/classes"),
  getMyPrivateSessions: () => apiClient.get("/coaches/me/private-sessions"),
  getCoachDetail: (coachId) => apiClient.get(`/coaches/${coachId}`),
  getCoachReviews: (coachId) => apiClient.get(`/coaches/${coachId}/reviews`),
  upsertCoachReview: (coachId, payload) => apiClient.post(`/coaches/${coachId}/reviews`, payload),
  getClassDetail: (classId) => apiClient.get(`/coach-classes/${classId}`),
  getClassEnrollments: (classId) => apiClient.get(`/coach-classes/${classId}/enrollments`),
  createClass: (payload) => apiClient.post("/coaches/classes", payload),
  updateCoachProfile: (payload) => apiClient.patch("/users/me", payload),
  updateClass: (classId, payload) => apiClient.patch(`/coaches/classes/${classId}`, payload),
  bookPrivateSession: (coachId, payload) => apiClient.post(`/coaches/${coachId}/private-sessions`, payload),
  updatePrivateSession: (sessionId, payload) => apiClient.patch(`/coach-private-sessions/${sessionId}`, payload),
  getMyCoachReviews: () => apiClient.get("/coaches/me/reviews"),
  replyCoachReview: (reviewId, payload) => apiClient.post(`/coach-reviews/${reviewId}/reply`, payload),
  startConversationWithCoach: (coachId) => apiClient.post("/dm/conversations", { targetUserId: coachId }),
  enrollClass: (classId, payload = {}) => apiClient.post(`/coach-classes/${classId}/enroll`, payload),
};
