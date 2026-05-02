import { useCallback, useEffect, useRef } from "react";
import { useAtom, useSetAtom } from "jotai";
import {
  notificationsAtom,
  unreadCountAtom,
  notifLoadingAtom,
} from "../store/notificationStore";
import { notificationService } from "../services/notificationService";

const POLL_INTERVAL = 30_000; // 30 seconds

export function useNotifications({ poll = true } = {}) {
  const [notifications, setNotifications] = useAtom(notificationsAtom);
  const [unreadCount, setUnreadCount]     = useAtom(unreadCountAtom);
  const setLoading                        = useSetAtom(notifLoadingAtom);
  const timerRef                          = useRef(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationService.getAll();
      if (res.ok) {
        setNotifications(res.data.notifications);
        setUnreadCount(res.data.unreadCount);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCount = useCallback(async () => {
    const res = await notificationService.getUnreadCount();
    if (res.ok) setUnreadCount(res.data.unreadCount);
  }, []);

  const markRead = useCallback(async (id) => {
    const res = await notificationService.markRead(id);
    if (res.ok) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
  }, []);

  const markAllRead = useCallback(async () => {
    const res = await notificationService.markAllRead();
    if (res.ok) {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    }
  }, []);

  const remove = useCallback(async (id) => {
    const wasUnread = notifications.find((n) => n.id === id && !n.isRead);
    await notificationService.delete(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
  }, [notifications]);

  // Initial fetch
  useEffect(() => {
    fetchAll();
  }, []);

  // Polling for unread count
  useEffect(() => {
    if (!poll) return;
    timerRef.current = setInterval(fetchCount, POLL_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [poll]);

  return { notifications, unreadCount, fetchAll, markRead, markAllRead, remove };
}
