import type { Request, Response, NextFunction, RequestHandler } from "express";
import { ApiResponse, type ResponseOptions, type PaginatedResponseOptions } from "./ApiResponse.js";
import type { PaginationMeta } from "../types/index.js";

/**
 * Shorthand helper to send a successful HTTP response.
 */
export function sendSuccess<T = unknown>(
  res: Response,
  data?: T,
  message = "Success",
  statusCode = 200,
  meta?: Record<string, unknown>
): Response {
  return ApiResponse.success(res, { data, message, statusCode, meta });
}

/**
 * Shorthand helper to send a HTTP 201 Created response.
 */
export function sendCreated<T = unknown>(
  res: Response,
  data?: T,
  message = "Resource created successfully",
  meta?: Record<string, unknown>
): Response {
  return ApiResponse.created(res, { data, message, meta });
}

/**
 * Shorthand helper to send a paginated response.
 */
export function sendPaginated<T = unknown>(
  res: Response,
  items: T[],
  pagination: PaginationMeta,
  message = "Data retrieved successfully",
  meta?: Record<string, unknown>
): Response {
  return ApiResponse.paginated(res, { data: items, pagination, message, meta });
}

// Module augmentation for Express Response
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Response {
      apiSuccess<T = unknown>(options?: ResponseOptions<T>): Response;
      apiCreated<T = unknown>(options?: Omit<ResponseOptions<T>, "statusCode">): Response;
      apiPaginated<T = unknown>(options: PaginatedResponseOptions<T>): Response;
    }
  }
}

/**
 * Express middleware that adds `res.apiSuccess`, `res.apiCreated`, and `res.apiPaginated` helpers
 * directly to the Express `res` object.
 *
 * @example
 * app.use(responseEnhancer());
 *
 * app.get('/users', (req, res) => {
 *   res.apiSuccess({ data: users, message: "Users list" });
 * });
 */
export function responseEnhancer(): RequestHandler {
  return (_req: Request, res: Response, next: NextFunction): void => {
    res.apiSuccess = function <T>(options?: ResponseOptions<T>) {
      return ApiResponse.success(res, options);
    };

    res.apiCreated = function <T>(options?: Omit<ResponseOptions<T>, "statusCode">) {
      return ApiResponse.created(res, options);
    };

    res.apiPaginated = function <T>(options: PaginatedResponseOptions<T>) {
      return ApiResponse.paginated(res, options);
    };

    next();
  };
}
