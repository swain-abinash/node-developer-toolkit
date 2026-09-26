import type { Request, Response, NextFunction, RequestHandler } from "express";
import { logger as defaultLogger, Logger } from "./logger.js";

export interface RequestLoggerOptions {
  /** Logger instance to use (default: defaultLogger) */
  logger?: Logger;
  /** Paths or regex to exclude from logging (e.g. ['/health', '/metrics', /^\/static/]) */
  skip?: (string | RegExp | ((req: Request) => boolean))[];
  /** Include request headers in logs (default: false) */
  includeHeaders?: boolean;
}

// ANSI Color helper
const COLORS = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  dim: "\x1b[2m",
};

function getStatusColor(status: number): string {
  if (status >= 500) return COLORS.red;
  if (status >= 400) return COLORS.yellow;
  if (status >= 300) return COLORS.cyan;
  if (status >= 200) return COLORS.green;
  return COLORS.reset;
}

/**
 * Express middleware for structured HTTP request logging.
 *
 * @example
 * app.use(requestLogger());
 * app.use(requestLogger({ skip: ['/health'] }));
 */
export function requestLogger(options: RequestLoggerOptions = {}): RequestHandler {
  const activeLogger = options.logger || defaultLogger;
  const skipList = options.skip || [];

  return (req: Request, res: Response, next: NextFunction): void => {
    // Check if path should be skipped
    const shouldSkip = skipList.some((pattern) => {
      if (typeof pattern === "string") return req.path === pattern;
      if (pattern instanceof RegExp) return pattern.test(req.path);
      if (typeof pattern === "function") return pattern(req);
      return false;
    });

    if (shouldSkip) {
      return next();
    }

    const startTime = process.hrtime.bigint();

    // Listen to finish event
    res.on("finish", () => {
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1_000_000;
      const formattedDuration = `${durationMs.toFixed(2)}ms`;

      const statusCode = res.statusCode;
      const statusColor = getStatusColor(statusCode);
      const method = req.method;
      const originalUrl = req.originalUrl || req.url;
      const ip = req.ip || req.socket.remoteAddress || "-";

      const message = `${method} ${originalUrl} ${statusColor}${statusCode}${COLORS.reset} - ${formattedDuration} - IP: ${ip}`;

      const meta: Record<string, unknown> = {
        method,
        url: originalUrl,
        statusCode,
        durationMs: Number(durationMs.toFixed(2)),
        ip,
        userAgent: req.get("user-agent") || "-",
      };

      if (options.includeHeaders) {
        meta.headers = req.headers;
      }

      if (statusCode >= 500) {
        activeLogger.error(message, meta);
      } else if (statusCode >= 400) {
        activeLogger.warn(message, meta);
      } else {
        activeLogger.http(message, meta);
      }
    });

    next();
  };
}
