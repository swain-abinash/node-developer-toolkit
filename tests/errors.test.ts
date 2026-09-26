import { describe, it, expect, vi } from "vitest";
import { ApiError, errorHandler, notFoundHandler } from "../src/errors/index.js";
import { HttpStatus } from "../src/utils/httpStatus.js";
import type { Request, Response, NextFunction } from "express";

describe("Errors Module", () => {
  describe("ApiError class", () => {
    it("should instantiate with correct defaults and properties", () => {
      const err = new ApiError(HttpStatus.BAD_REQUEST, "Invalid input", [{ field: "name" }]);
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(ApiError);
      expect(err.statusCode).toBe(400);
      expect(err.message).toBe("Invalid input");
      expect(err.isOperational).toBe(true);
      expect(err.errors).toEqual([{ field: "name" }]);
      expect(err.stack).toBeDefined();
    });

    it("should provide working static factory helpers", () => {
      expect(ApiError.badRequest().statusCode).toBe(HttpStatus.BAD_REQUEST);
      expect(ApiError.unauthorized().statusCode).toBe(HttpStatus.UNAUTHORIZED);
      expect(ApiError.forbidden().statusCode).toBe(HttpStatus.FORBIDDEN);
      expect(ApiError.notFound().statusCode).toBe(HttpStatus.NOT_FOUND);
      expect(ApiError.conflict().statusCode).toBe(HttpStatus.CONFLICT);
      expect(ApiError.unprocessable().statusCode).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(ApiError.tooManyRequests().statusCode).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(ApiError.internal().statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(ApiError.internal().isOperational).toBe(false);
    });
  });

  describe("errorHandler middleware", () => {
    it("should handle ApiError properly and output JSON response", () => {
      const err = ApiError.notFound("User not found");
      const req = { method: "GET", originalUrl: "/users/99" } as Request;

      let responseStatus = 0;
      let responseJson: Record<string, unknown> = {};

      const res = {
        headersSent: false,
        status: (code: number) => {
          responseStatus = code;
          return {
            json: (payload: Record<string, unknown>) => {
              responseJson = payload;
            },
          };
        },
      } as unknown as Response;

      const next: NextFunction = vi.fn();
      const middleware = errorHandler({ showStack: false });

      middleware(err, req, res, next);

      expect(responseStatus).toBe(404);
      expect(responseJson.success).toBe(false);
      expect(responseJson.statusCode).toBe(404);
      expect(responseJson.message).toBe("User not found");
      expect(responseJson.timestamp).toBeDefined();
      expect(responseJson.stack).toBeUndefined();
    });

    it("should include stack trace when showStack is true", () => {
      const err = new Error("Generic error");
      const req = { method: "GET", originalUrl: "/test" } as Request;
      let responseJson: Record<string, unknown> = {};

      const res = {
        headersSent: false,
        status: () => ({
          json: (payload: Record<string, unknown>) => {
            responseJson = payload;
          },
        }),
      } as unknown as Response;

      const middleware = errorHandler({ showStack: true });
      middleware(err, req, res, vi.fn());

      expect(responseJson.stack).toBeDefined();
    });

    it("should trigger onError hook if supplied", () => {
      const onErrorHook = vi.fn();
      const err = new Error("Boom");
      const req = { method: "POST", originalUrl: "/api" } as Request;
      const res = {
        headersSent: false,
        status: () => ({ json: vi.fn() }),
      } as unknown as Response;

      const middleware = errorHandler({ onError: onErrorHook });
      middleware(err, req, res, vi.fn());

      expect(onErrorHook).toHaveBeenCalledWith(err, req);
    });
  });

  describe("notFoundHandler middleware", () => {
    it("should forward 404 ApiError to next()", () => {
      const req = { method: "GET", originalUrl: "/unknown-route" } as Request;
      const res = {} as Response;
      const next = vi.fn();

      const middleware = notFoundHandler();
      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const passedErr = next.mock.calls[0][0];
      expect(passedErr).toBeInstanceOf(ApiError);
      expect(passedErr.statusCode).toBe(404);
      expect(passedErr.message).toContain("/unknown-route");
    });
  });
});
