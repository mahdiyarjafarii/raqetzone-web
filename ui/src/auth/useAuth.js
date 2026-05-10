import { toast } from "react-hot-toast";
import { useAtom, useSetAtom } from "jotai";

import authStorage from "./storage";
import apiClient from "@/lib/apiClient";
import { currentUserAtom, showOverlayLoadingAtom } from "@/config/state";
import userIcon from "@/assets/img/user.png";
import { clearPreferenceCache } from "@/hooks/useUserPreference";

export default function useAuth() {
  const [currentUser, setCurrentUser] = useAtom(currentUserAtom);
  const setShowOverlayLoading = useSetAtom(showOverlayLoadingAtom);
  
  const logIn = (data) => {
    authStorage.storeToken(data.token);
    setCurrentUser(data.user);
  };

  const logOut = async () => {
    authStorage.removeToken();
    setCurrentUser(null);
    // Clear preference cache on logout
    clearPreferenceCache();

    window.location.reload();
  };

  const updateUser = async () => {
    if(! currentUser) return;
  
    const { data, ok } = await apiClient.get("/users/me");
    if(!ok) return toast.error("خطا در به روز رسانی اطلاعات کاربر");

    setCurrentUser(data.user);
  }

  const getUserImage = (image = currentUser?.image) => {
    if(image) {
      if(image.startsWith("https://")) return image;

      return `${import.meta.env.VITE_WEBSITE_URL}/uploads/user/${image}`;
    }

    return userIcon;
  };

  const handleLoginSuccess = async () => {
    const phone = currentUser?.phone || "";

    if (!phone) {
      return toast.error("لطفاً وارد حساب کاربری شوید");
    }

    const { ok, data, problem } = await apiClient.post("/auth/check-user", {
      phone,
    });

    if (!ok) return toast.error(problem || "خطا در بررسی حساب کاربری");

    logIn(data);
  };

  return { logIn, logOut, setCurrentUser, currentUser, updateUser, getUserImage, handleLoginSuccess };
};