import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server as SocketServer } from "socket.io";
import jwt from "jsonwebtoken";

import { config } from "./config/env.js";
import authRoutes from "./routes/auth.js";
import chatRoutes from "./routes/chat.js";
import userRoutes from "./routes/user.js";
import paymentRoutes from "./routes/payment.js";
import walletRoutes from "./routes/wallet.js";
import analyticsRoutes from "./routes/analytics.js";
import uploadRoutes from "./routes/upload.js";
import preferenceRoutes from "./routes/preference.js";
import matchRoutes from "./routes/matches.js";
import courtRoutes from "./routes/courts.js";
import bookingRoutes from "./routes/bookings.js";
import homeRoutes from "./routes/home.js";
import profileRoutes from "./routes/profile.js";
import notificationRoutes from "./routes/notifications.js";
import adminRoutes from "./routes/admin.js";
import clubPanelRoutes from "./routes/clubPanel.js";
import reviewRoutes from "./routes/reviews.js";
import publicRoutes from "./routes/public.js";
import tournamentRoutes from "./routes/tournaments.js";
import directMessagesRoutes from "./routes/directMessages.js";
import rankingRoutes from "./routes/rankings.js";
import gamesRoutes from "./routes/games.js";
import coachRoutes from "./routes/coaches.js";
import { errorHandler } from "./middleware/errorHandler.js";

import "./jobs/dailyCreditsReset.js";
import "./jobs/bookingReminder.js";
import "./jobs/certifiedMatchFiller.js";
import "./jobs/matchResultReminder.js";
import "./jobs/matchFillReminder.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

export const io = new SocketServer(httpServer, {
  cors: { origin: "*", credentials: true },
});

const onlineUserSockets = new Map();

export function isUserOnline(userId) {
  return (onlineUserSockets.get(userId) ?? 0) > 0;
}

io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.["x-auth-token"];
  if (!token) return next(new Error("unauthorized"));
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    socket.userId = decoded.userId;
    next();
  } catch {
    next(new Error("unauthorized"));
  }
});

io.on("connection", (socket) => {
  socket.join(`user:${socket.userId}`);
  onlineUserSockets.set(socket.userId, (onlineUserSockets.get(socket.userId) ?? 0) + 1);
  io.emit("presence_changed", { userId: socket.userId, isOnline: true });
  socket.on("disconnect", () => {
    const count = (onlineUserSockets.get(socket.userId) ?? 1) - 1;
    if (count <= 0) {
      onlineUserSockets.delete(socket.userId);
      io.emit("presence_changed", { userId: socket.userId, isOnline: false });
    } else {
      onlineUserSockets.set(socket.userId, count);
    }
  });
});

app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Serve static files (uploads)
app.use("/uploads", express.static(path.join(__dirname, "../public/uploads"), {
  maxAge: '7d',
}));

// Routes — public first (no auth middleware interference)
app.use("/api", publicRoutes);

app.use("/api", authRoutes);
app.use("/api", paymentRoutes);
app.use("/api", walletRoutes);
app.use("/api", preferenceRoutes);
app.use("/api", chatRoutes);
app.use("/api", userRoutes);
app.use("/api", analyticsRoutes);
app.use("/api", uploadRoutes);
app.use("/api", matchRoutes);
app.use("/api", courtRoutes);
app.use("/api", bookingRoutes);
app.use("/api", homeRoutes);
app.use("/api", profileRoutes);
app.use("/api", notificationRoutes);
app.use("/api", clubPanelRoutes);
app.use("/api", reviewRoutes);
app.use("/api", tournamentRoutes);
app.use("/api", rankingRoutes);
app.use("/api", gamesRoutes);
app.use("/api", coachRoutes);
app.use("/api/dm", directMessagesRoutes);
app.use("/api", adminRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = config.port;
httpServer.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
  console.log(`✅ Frontend URL: ${config.frontendUrl}`);
});

export default app;
