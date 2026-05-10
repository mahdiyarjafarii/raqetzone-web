import { useState, useEffect, useCallback } from "react";
import apiClient from "@/lib/apiClient";

export function useClubs() {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/public/clubs");
      setClubs(res.ok ? (res.data?.clubs ?? []) : []);
    } catch {
      setClubs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, []);

  return { clubs, loading, refetch: fetch };
}

export function useClub(clubId) {
  const [club, setClub] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clubId) return;
    setLoading(true);
    apiClient.get("/public/clubs")
      .then((res) => {
        if (res.ok && res.data?.clubs) {
          const found = res.data.clubs.find(c => c.id === clubId);
          setClub(found ?? null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clubId]);

  return { club, loading };
}
