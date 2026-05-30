import { useEffect } from "react";
import { useAtom } from "jotai";
import { connectSocket, disconnectSocket, getSocket } from "@/lib/socket";
import { unreadDmCountAtom } from "@/config/state";
import useAuth from "@/auth/useAuth";

export default function useSocket() {
  const { currentUser } = useAuth();
  const [, setUnreadCount] = useAtom(unreadDmCountAtom);

  useEffect(() => {
    if (!currentUser) {
      disconnectSocket();
      return;
    }

    const socket = connectSocket();

    socket.on("new_message", () => {
      setUnreadCount((n) => n + 1);
    });

    return () => {
      socket.off("new_message");
    };
  }, [currentUser]);
}
