import type { Response } from "express";
import { HttpStatus, type HttpStatusCode } from "../utils/httpStatus.js";
import type { PaginationMeta, StandardResponse } from "../types/index.js";

export interface ResponseOptions<T = unknown> {
  data?: T;
  message?: string;
  statusCode?: HttpStatusCode | number;
  meta?: Record<string, unknown>;
}

export interface PaginatedResponseOptions<T = unknown> {
  data: T[];
  pagination: PaginationMeta;
  message?: string;
  statusCode?: HttpStatusCode | number;
  meta?: Record<string, unknown>;
}

export class ApiResponse {
  /**
   * Pure formatter that generates a standardized response object without sending HTTP.
   * Useful in serverless functions, Fastify, NestJS, or custom pipelines.
   */
  public static format<T = unknown>(options: ResponseOptions<T> = {}): StandardResponse<T> {
    const {
      data,
      message = "Success",
      statusCode = HttpStatus.OK,
      meta,
    } = options;

    const response: StandardResponse<T> = {
      success: statusCode >= 200 && statusCode < 400,
      statusCode,
      message,
      timestamp: new Date().toISOString(),
    };

    if (data !== undefined) {
      response.data = data;
    }

    if (meta !== undefined) {
      response.meta = meta;
    }

    return response;
  }

  /**
   * Sends a standardized HTTP 200 (or custom) Success response.
   *
   * @example
   * ApiResponse.success(res, { data: user, message: "User retrieved successfully" });
   */
  public static success<T = unknown>(
    res: Response,
    options: ResponseOptions<T> = {}
  ): Response {
    const statusCode = options.statusCode ?? HttpStatus.OK;
    const payload = ApiResponse.format({ ...options, statusCode });
    return res.status(statusCode).json(payload);
  }

  /**
   * Sends a standardized HTTP 201 Created response.
   *
   * @example
   * ApiResponse.created(res, { data: newUser, message: "User registered successfully" });
   */
  public static created<T = unknown>(
    res: Response,
    options: Omit<ResponseOptions<T>, "statusCode"> = {}
  ): Response {
    const statusCode = HttpStatus.CREATED;
    const message = options.message ?? "Resource created successfully";
    const payload = ApiResponse.format({ ...options, statusCode, message });
    return res.status(statusCode).json(payload);
  }

  /**
   * Sends a HTTP 204 No Content response.
   *
   * @example
   * ApiResponse.noContent(res);
   */
  public static noContent(res: Response): Response {
    return res.status(HttpStatus.NO_CONTENT).send();
  }

  /**
   * Sends a standardized Paginated response with items and pagination metadata.
   *
   * @example
   * ApiResponse.paginated(res, {
   *   data: users,
   *   pagination: meta,
   *   message: "Users retrieved"
   * });
   */
  public static paginated<T = unknown>(
    res: Response,
    options: PaginatedResponseOptions<T>
  ): Response {
    const { data, pagination, message = "Data retrieved successfully", meta = {} } = options;
    const statusCode = options.statusCode ?? HttpStatus.OK;

    const payload: StandardResponse<T[]> = {
      success: true,
      statusCode,
      message,
      data,
      meta: {
        ...meta,
        pagination,
      },
      timestamp: new Date().toISOString(),
    };

    return res.status(statusCode).json(payload);
  }
}
