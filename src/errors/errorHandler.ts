import type { Request, Response, NextFunction, ErrorRequestHandler, RequestHandler } from "express";
import { ApiError } from "./ApiError.js";
import { HttpStatus } from "../utils/httpStatus.js";
import { logger as defaultLogger, Logger } from "../logger/logger.js";

export interface ErrorHandlerOptions {
  /** Explicitly toggle stack trace inclusion in response (defaults to true in non-production) */
  showStack?: boolean;
  /** Logger instance to use (default: defaultLogger) */
  logger?: Logger;
  /** Optional callback for third-party reporting (e.g. Sentry, Datadog) */
  onError?: (err: Error, req: Request) => void;
}

/**
 * Global Express Error Handling Middleware.
 * Catches all thrown or forwarded errors, formats them into a standardized JSON response,
 * and logs unexpected failures.
 *
 * @example
 * app.use(errorHandler());
 */
export function errorHandler(options: ErrorHandlerOptions = {}): ErrorRequestHandler {
  const activeLogger = options.logger || defaultLogger;
  const isProd = process.env.NODE_ENV === "production";
  const shouldShowStack = options.showStack ?? !isProd;

  return (err: Error | ApiError, req: Request, res: Response, next: NextFunction): void => {
    // If headers are already sent, delegate to Express default handler
    if (res.headersSent) {
      return next(err);
    }

    let statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal Server Error";
    let errors: unknown[] | undefined;
    let isOperational = false;

    if (err instanceof ApiError) {
      statusCode = err.statusCode;
      message = err.message;
      errors = err.errors;
      isOperational = err.isOperational;
    } else if (err instanceof Error) {
      // Handle known 3rd party error conventions (e.g. Mongoose CastError / ValidationError / JWT)
      if (err.name === "ValidationError") {
        statusCode = HttpStatus.UNPROCESSABLE_ENTITY;
        message = err.message || "Validation Error";
      } else if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
        statusCode = HttpStatus.UNAUTHORIZED;
        message = "Invalid or expired authentication token";
      } else {
        message = isProd ? "An unexpected server error occurred" : err.message;
      }
    }

    // Log the error
    if (!isOperational && statusCode >= 500) {
      activeLogger.error(`[UnhandledError] ${req.method} ${req.originalUrl}: ${err.message}`, {
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        body: req.body,
        query: req.query,
      });
    }

    // Call custom onError hook if provided
    if (options.onError) {
      try {
        options.onError(err, req);
      } catch (hookErr) {
        activeLogger.error("Error in errorHandler onError hook:", hookErr);
      }
    }

    const responseBody: Record<string, unknown> = {
      success: false,
      statusCode,
      message,
      timestamp: new Date().toISOString(),
    };

    if (errors && errors.length > 0) {
      responseBody.errors = errors;
    }

    if (shouldShowStack && err.stack) {
      responseBody.stack = err.stack;
    }

    res.status(statusCode).json(responseBody);
  };
}

/**
 * 404 Route Not Found Middleware. Place this right before your `errorHandler`.
 *
 * @example
 * app.use(notFoundHandler());
 * app.use(errorHandler());
 */
export function notFoundHandler(): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    next(ApiError.notFound(`Route '${req.method} ${req.originalUrl}' does not exist on this server`));
  };
}
