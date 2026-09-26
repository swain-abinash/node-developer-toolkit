import { HttpStatus, type HttpStatusCode } from "../utils/httpStatus.js";

/**
 * Custom operational API Error class representing HTTP client or server errors.
 *
 * @example
 * throw ApiError.notFound("User not found");
 * throw ApiError.badRequest("Invalid email address", [{ field: "email", message: "Invalid format" }]);
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errors?: unknown[];

  constructor(
    statusCode: HttpStatusCode | number,
    message: string,
    errors?: unknown[],
    isOperational = true,
    stack = ""
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  // --- Static Factory Helpers ---

  /** 400 Bad Request */
  public static badRequest(message = "Bad Request", errors?: unknown[]): ApiError {
    return new ApiError(HttpStatus.BAD_REQUEST, message, errors);
  }

  /** 401 Unauthorized */
  public static unauthorized(message = "Unauthorized access"): ApiError {
    return new ApiError(HttpStatus.UNAUTHORIZED, message);
  }

  /** 403 Forbidden */
  public static forbidden(message = "Forbidden resource"): ApiError {
    return new ApiError(HttpStatus.FORBIDDEN, message);
  }

  /** 404 Not Found */
  public static notFound(message = "Resource not found"): ApiError {
    return new ApiError(HttpStatus.NOT_FOUND, message);
  }

  /** 409 Conflict */
  public static conflict(message = "Resource already exists"): ApiError {
    return new ApiError(HttpStatus.CONFLICT, message);
  }

  /** 422 Unprocessable Entity */
  public static unprocessable(
    message = "Unprocessable Entity",
    errors?: unknown[]
  ): ApiError {
    return new ApiError(HttpStatus.UNPROCESSABLE_ENTITY, message, errors);
  }

  /** 429 Too Many Requests */
  public static tooManyRequests(message = "Too many requests, please try again later"): ApiError {
    return new ApiError(HttpStatus.TOO_MANY_REQUESTS, message);
  }

  /** 500 Internal Server Error */
  public static internal(message = "Internal Server Error", isOperational = false): ApiError {
    return new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, message, undefined, isOperational);
  }
}
