import apiClient from "@/lib/apiClient";

export const profileService = {
  getMyProfile: () => apiClient.get("/profile/me"),
  updateProfile: (data) => apiClient.patch("/profile/me", data),
  uploadImage: (file) => {
    const form = new FormData();
    form.append("image", file);
    return apiClient.post("/users/upload-image", form);
  },
};
