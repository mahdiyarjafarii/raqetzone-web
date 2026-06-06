import apiClient from "@/lib/apiClient";
import authStorage from "@/auth/storage";

const sendUploadDebugLog = async (event, payload = {}) => {
  try {
    const token = authStorage.getToken();
    await fetch(`${import.meta.env.VITE_WEBSITE_URL}/api/users/upload-image/debug-log`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": token ?? "",
      },
      body: JSON.stringify({
        event,
        payload,
        pageUrl: window.location.href,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        online: navigator.onLine,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.error("Profile image debug log failed:", error);
  }
};

export const profileService = {
  getMyProfile: () => apiClient.get("/profile/me"),
  updateProfile: (data) => apiClient.patch("/profile/me", data),
  uploadImage: async (file) => {
    const form = new FormData();
    form.append("image", file);
    try {
      const startPayload = {
        name: file?.name,
        type: file?.type,
        size: file?.size,
        lastModified: file?.lastModified,
      };
      console.log("Profile image upload start:", startPayload);
      sendUploadDebugLog("upload_start", startPayload);

      const res = await fetch(`${import.meta.env.VITE_WEBSITE_URL}/api/users/upload-image`, {
        method: "POST",
        headers: { "x-auth-token": authStorage.getToken() ?? "" },
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      const responsePayload = {
        status: res.status,
        ok: res.ok,
        data,
      };
      console.log("Profile image upload response:", responsePayload);
      sendUploadDebugLog("upload_response", responsePayload);

      return { ok: res.ok, data };
    } catch (error) {
      console.error("Profile image upload failed:", error);
      sendUploadDebugLog("upload_failed", {
        message: error?.message,
        name: error?.name,
      });
      return { ok: false, data: { message: "خطا در اتصال" } };
    }
  },
};
