import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import { config } from "./config/env.js";
import authRoutes from "./routes/auth.js";
import chatRoutes from "./routes/chat.js";
import gptRoutes from "./routes/gpts.js";
import userRoutes from "./routes/user.js";
import modelRoutes from "./routes/models.js";
import imageRoutes from "./routes/images.js";
import videoRoutes from "./routes/videos.js";
import paymentRoutes from "./routes/payment.js";
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
import { errorHandler } from "./middleware/errorHandler.js";

import "./workers/videoWorker.js";
import "./jobs/dailyCreditsReset.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (uploads)
app.use("/uploads", express.static(path.join(__dirname, "../public/uploads"), {
  maxAge: '7d',
}));

// Routes
app.use("/api", authRoutes);
app.use("/api", paymentRoutes);
app.use("/api", preferenceRoutes);
app.use("/api", chatRoutes);
app.use("/api", gptRoutes);
app.use("/api", userRoutes);
app.use("/api", modelRoutes);
app.use("/api", imageRoutes);
app.use("/api", videoRoutes);
app.use("/api", analyticsRoutes);
app.use("/api", uploadRoutes);
app.use("/api", matchRoutes);
app.use("/api", courtRoutes);
app.use("/api", bookingRoutes);
app.use("/api", homeRoutes);
app.use("/api", profileRoutes);
app.use("/api", notificationRoutes);
app.use("/api", adminRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
  console.log(`✅ Frontend URL: ${config.frontendUrl}`);
});

export default app;
