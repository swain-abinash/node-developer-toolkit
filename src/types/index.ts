import type { Request, Response, NextFunction } from "express";

/**
 * Standard log levels supported by the toolkit logger
 */
export type LogLevel = "debug" | "http" | "info" | "warn" | "error" | "silent";

/**
 * Configuration options for the logger
 */
export interface LoggerOptions {
  /**
   * Minimum log level to display (default: 'info' in prod, 'debug' in dev)
   */
  level?: LogLevel;
  /**
   * Output format: 'pretty' for human-readable colorized logs, 'json' for structured log aggregators
   */
  format?: "pretty" | "json";
  /**
   * Prefix/service name for logs (e.g. 'AUTH-SERVICE')
   */
  serviceName?: string;
  /**
   * Custom timestamp formatter or boolean to enable/disable (default: true)
   */
  timestamp?: boolean;
}

/**
 * Standard API Response structure returned by ApiResponse
 */
export interface StandardResponse<T = unknown> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  meta?: Record<string, unknown>;
  errors?: unknown[];
  timestamp: string;
}

/**
 * Query options passed to pagination parser
 */
export interface PaginationOptions {
  defaultLimit?: number;
  maxLimit?: number;
  defaultSort?: string;
  defaultOrder?: "asc" | "desc";
}

/**
 * Parsed pagination parameters
 */
export interface ParsedPagination {
  page: number;
  limit: number;
  skip: number;
  sort: string;
  order: "asc" | "desc";
}

/**
 * Metadata for paginated responses
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextPage: number | null;
  prevPage: number | null;
}

/**
 * Paginated data response payload
 */
export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationMeta;
}

/**
 * Async request handler type for Express controllers
 */
export type AsyncRequestHandler<
  P = any,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any
> = (
  req: Request<P, ResBody, ReqBody, ReqQuery>,
  res: Response<ResBody>,
  next: NextFunction
) => Promise<unknown> | unknown;

/**
 * Field validation rule definition
 */
export interface ValidationFieldRule {
  type?: "string" | "number" | "boolean" | "array" | "object" | "email" | "uuid" | "url";
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  enum?: (string | number)[];
  custom?: (value: unknown) => boolean | string | Promise<boolean | string>;
  message?: string;
}

/**
 * Validation schema mapping field names to rules
 */
export type ValidationRules = Record<string, ValidationFieldRule>;

/**
 * Complete schema covering body, query, params
 */
export interface RequestValidationSchema {
  body?: ValidationRules;
  query?: ValidationRules;
  params?: ValidationRules;
  headers?: ValidationRules;
}

/**
 * Single validation error detail
 */
export interface ValidationErrorDetail {
  field: string;
  source: "body" | "query" | "params" | "headers";
  message: string;
  received?: unknown;
}
