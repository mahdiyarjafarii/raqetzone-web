import { useState, useEffect, useCallback } from "react";
import { profileService } from "../services/profileService";

export function useProfileData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await profileService.getMyProfile();
      if (res.ok) setData(res.data);
      else setError(res.data?.message ?? "خطا در بارگذاری پروفایل");
    } catch {
      setError("خطای شبکه");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, []);

  return { data, loading, error, refetch: fetch, setData };
}
