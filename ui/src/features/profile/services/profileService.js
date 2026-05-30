import apiClient from "@/lib/apiClient";
import authStorage from "@/auth/storage";

export const profileService = {
  getMyProfile: () => apiClient.get("/profile/me"),
  updateProfile: (data) => apiClient.patch("/profile/me", data),
  uploadImage: async (file) => {
    const form = new FormData();
    form.append("image", file);
    try {
      const res = await fetch(`${import.meta.env.VITE_WEBSITE_URL}/api/users/upload-image`, {
        method: "POST",
        headers: { "x-auth-token": authStorage.getToken() ?? "" },
        body: form,
      });
      const data = await res.json();
      return { ok: res.ok, data };
    } catch {
      return { ok: false, data: { message: "خطا در اتصال" } };
    }
  },
};
