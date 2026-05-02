import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { homeService } from "../services/homeService";

export function useHomeData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await homeService.getHome();
      if (res.ok) {
        setData(res.data);
      } else {
        setError("خطا در بارگذاری");
        toast.error("خطا در بارگذاری صفحه اصلی");
      }
    } catch {
      setError("خطای شبکه");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, []);

  return { data, loading, error, refetch: fetch };
}
