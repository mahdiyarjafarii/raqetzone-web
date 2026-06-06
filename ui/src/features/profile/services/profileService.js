import apiClient from "@/lib/apiClient";
import authStorage from "@/auth/storage";

export const profileService = {
  getMyProfile: () => apiClient.get("/profile/me"),
  updateProfile: (data) => apiClient.patch("/profile/me", data),
  uploadImage: async (file) => {
    const form = new FormData();
    form.append("image", file);
    try {
      console.log("Profile image upload start:", {
        name: file?.name,
        type: file?.type,
        size: file?.size,
        lastModified: file?.lastModified,
      });
      const res = await fetch(`${import.meta.env.VITE_WEBSITE_URL}/api/users/upload-image`, {
        method: "POST",
        headers: { "x-auth-token": authStorage.getToken() ?? "" },
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      console.log("Profile image upload response:", {
        status: res.status,
        ok: res.ok,
        data,
      });
      return { ok: res.ok, data };
    } catch (error) {
      console.error("Profile image upload failed:", error);
      return { ok: false, data: { message: "خطا در اتصال" } };
    }
  },
};
