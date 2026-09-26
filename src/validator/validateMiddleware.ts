import type { Request, Response, NextFunction, RequestHandler } from "express";
import { ApiError } from "../errors/ApiError.js";
import { validateObject } from "./validator.js";
import type { RequestValidationSchema, ValidationErrorDetail } from "../types/index.js";

// Helper interface for external schema libraries (like Zod or Joi)
export interface ZodLikeSchema {
  safeParseAsync?: (data: unknown) => Promise<{ success: boolean; error?: { issues: { path: (string | number)[]; message: string }[] }; data?: unknown }>;
  safeParse?: (data: unknown) => { success: boolean; error?: { issues: { path: (string | number)[]; message: string }[] }; data?: unknown };
}

export interface ValidateMiddlewareOptions {
  /** HTTP status code to return on validation error (default: 400 Bad Request) */
  statusCode?: 400 | 422;
}

/**
 * Express middleware for validating request body, query, params, or headers.
 * Works with built-in schema rules or external Zod/Joi schemas.
 *
 * @example Built-in rules:
 * router.post("/register", validate({
 *   body: {
 *     email: { type: "email", required: true },
 *     password: { type: "string", required: true, minLength: 8 },
 *     age: { type: "number", min: 18 }
 *   },
 *   query: {
 *     referral: { type: "string" }
 *   }
 * }), controller);
 *
 * @example Zod schema:
 * router.post("/login", validate(zodUserSchema), controller);
 */
export function validate(
  schema: RequestValidationSchema | ZodLikeSchema,
  options: ValidateMiddlewareOptions = {}
): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const allErrors: ValidationErrorDetail[] = [];

      // Check if schema is a Zod schema
      if ("safeParseAsync" in schema || "safeParse" in schema) {
        const zodSchema = schema as ZodLikeSchema;
        const result = zodSchema.safeParseAsync
          ? await zodSchema.safeParseAsync(req.body)
          : zodSchema.safeParse!(req.body);

        if (!result.success && result.error) {
          const zodErrors: ValidationErrorDetail[] = result.error.issues.map((issue) => ({
            field: issue.path.join("."),
            source: "body",
            message: issue.message,
          }));
          const err = options.statusCode === 422
            ? ApiError.unprocessable("Validation failed", zodErrors)
            : ApiError.badRequest("Validation failed", zodErrors);
          return next(err);
        }
        return next();
      }

      const standardSchema = schema as RequestValidationSchema;

      // Validate Body
      if (standardSchema.body) {
        const { errors } = await validateObject(req.body as Record<string, unknown>, standardSchema.body, "body");
        allErrors.push(...errors);
      }

      // Validate Query
      if (standardSchema.query) {
        const { errors } = await validateObject(req.query as Record<string, unknown>, standardSchema.query, "query");
        allErrors.push(...errors);
      }

      // Validate Params
      if (standardSchema.params) {
        const { errors } = await validateObject(req.params as Record<string, unknown>, standardSchema.params, "params");
        allErrors.push(...errors);
      }

      // Validate Headers
      if (standardSchema.headers) {
        const { errors } = await validateObject(req.headers as Record<string, unknown>, standardSchema.headers, "headers");
        allErrors.push(...errors);
      }

      if (allErrors.length > 0) {
        const err = options.statusCode === 422
          ? ApiError.unprocessable("Validation failed", allErrors)
          : ApiError.badRequest("Validation failed", allErrors);
        return next(err);
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
