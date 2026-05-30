import { io } from "socket.io-client";
import authStorage from "@/auth/storage";

const SOCKET_URL = import.meta.env.VITE_WEBSITE_URL ?? "http://localhost:3000";

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      auth: { token: authStorage.getToken() },
    });
  }
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  s.auth = { token: authStorage.getToken() };
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  if (socket?.connected) socket.disconnect();
}
