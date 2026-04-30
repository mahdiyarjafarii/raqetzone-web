import { log } from "../utils/logger.js";

export const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function (...args) {
    const responseTime = Date.now() - startTime;

    const logData = {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get("User-Agent"),
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userId: req.user?.id || null,
    };

    if (res.statusCode >= 400) {
      log.warn("HTTP Request", logData);
    } else {
      log.info("HTTP Request", logData);
    }

    originalEnd.apply(this, args);
  };

  next();
};
