import { describe, it, expect, vi } from "vitest";
import { validateField, validateObject, validate } from "../src/validator/index.js";
import { ApiError } from "../src/errors/ApiError.js";
import type { Request, Response, NextFunction } from "express";

describe("Validator Module", () => {
  describe("validateField", () => {
    it("should validate required fields", async () => {
      const err = await validateField("", { required: true }, "name");
      expect(err).not.toBeNull();
      expect(err?.field).toBe("name");
      expect(err?.message).toContain("name is required");

      const valid = await validateField("Antigravity", { required: true }, "name");
      expect(valid).toBeNull();
    });

    it("should validate email format", async () => {
      expect(await validateField("not-an-email", { type: "email" }, "email")).not.toBeNull();
      expect(await validateField("test@example.com", { type: "email" }, "email")).toBeNull();
    });

    it("should validate uuid format", async () => {
      expect(await validateField("not-a-uuid", { type: "uuid" }, "id")).not.toBeNull();
      expect(await validateField("123e4567-e89b-12d3-a456-426614174000", { type: "uuid" }, "id")).toBeNull();
    });

    it("should validate url format", async () => {
      expect(await validateField("not-a-url", { type: "url" }, "website")).not.toBeNull();
      expect(await validateField("https://example.com/api", { type: "url" }, "website")).toBeNull();
    });

    it("should validate booleans, arrays, and objects", async () => {
      expect(await validateField("invalid", { type: "boolean" }, "isActive")).not.toBeNull();
      expect(await validateField(true, { type: "boolean" }, "isActive")).toBeNull();
      expect(await validateField("not-array", { type: "array" }, "tags")).not.toBeNull();
      expect(await validateField(["tag1"], { type: "array" }, "tags")).toBeNull();
      expect(await validateField("not-obj", { type: "object" }, "meta")).not.toBeNull();
      expect(await validateField({ key: 1 }, { type: "object" }, "meta")).toBeNull();
    });

    it("should validate numbers and range", async () => {
      expect(await validateField("abc", { type: "number" }, "age")).not.toBeNull();
      expect(await validateField(15, { type: "number", min: 18 }, "age")).not.toBeNull();
      expect(await validateField(25, { type: "number", min: 18, max: 60 }, "age")).toBeNull();
    });

    it("should validate string lengths", async () => {
      expect(await validateField("short", { minLength: 8 }, "password")).not.toBeNull();
      expect(await validateField("toolongtext", { maxLength: 5 }, "code")).not.toBeNull();
      expect(await validateField("validpass", { minLength: 6, maxLength: 20 }, "password")).toBeNull();
    });

    it("should validate enum values", async () => {
      expect(await validateField("superadmin", { enum: ["user", "admin"] }, "role")).not.toBeNull();
      expect(await validateField("admin", { enum: ["user", "admin"] }, "role")).toBeNull();
    });

    it("should support custom async validators", async () => {
      const isUniqueEmail = async (val: unknown) => {
        return val !== "taken@example.com";
      };

      const err = await validateField("taken@example.com", { custom: isUniqueEmail, message: "Email is already taken" }, "email");
      expect(err).not.toBeNull();
      expect(err?.message).toBe("Email is already taken");

      const valid = await validateField("free@example.com", { custom: isUniqueEmail }, "email");
      expect(valid).toBeNull();
    });
  });

  describe("validateObject", () => {
    it("should validate full object and collect all errors", async () => {
      const payload = {
        name: "",
        email: "bad-email",
        age: 12,
      };

      const { valid, errors } = await validateObject(payload, {
        name: { required: true },
        email: { type: "email", required: true },
        age: { type: "number", min: 18 },
      });

      expect(valid).toBe(false);
      expect(errors.length).toBe(3);
    });
  });

  describe("validate middleware", () => {
    it("should pass to next() if payload is valid", async () => {
      const middleware = validate({
        body: {
          username: { required: true, minLength: 3 },
        },
      });

      const req = { body: { username: "abinash" } } as Request;
      const res = {} as Response;
      const next: NextFunction = vi.fn();

      await middleware(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it("should pass ApiError to next() if payload is invalid", async () => {
      const middleware = validate({
        body: {
          username: { required: true, minLength: 5 },
        },
      });

      const req = { body: { username: "ab" } } as Request;
      const res = {} as Response;
      const next: NextFunction = vi.fn();

      await middleware(req, res, next);
      expect(next).toHaveBeenCalled();
      const err = (next as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0] as ApiError;
      expect(err).toBeInstanceOf(ApiError);
      expect(err.statusCode).toBe(400);
      expect(err.errors?.length).toBe(1);
    });

    it("should validate query, params, and headers", async () => {
      const middleware = validate({
        query: { page: { type: "number", required: true } },
        params: { id: { type: "uuid", required: true } },
        headers: { "x-api-key": { type: "string", required: true } },
      }, { statusCode: 422 });

      const req = {
        query: { page: "invalid" },
        params: { id: "not-uuid" },
        headers: {},
      } as unknown as Request;
      const res = {} as Response;
      const next: NextFunction = vi.fn();

      await middleware(req, res, next);
      expect(next).toHaveBeenCalled();
      const err = (next as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0] as ApiError;
      expect(err.statusCode).toBe(422);
      expect(err.errors?.length).toBe(3);
    });

    it("should support Zod-like schema objects", async () => {
      const mockZodSchema = {
        safeParseAsync: async (data: unknown) => {
          if (!data || typeof data !== "object" || !("title" in data)) {
            return {
              success: false,
              error: {
                issues: [{ path: ["title"], message: "Title is required" }],
              },
            };
          }
          return { success: true, data };
        },
      };

      const middleware = validate(mockZodSchema);
      const req = { body: {} } as Request;
      const next: NextFunction = vi.fn();

      await middleware(req, {} as Response, next);
      expect(next).toHaveBeenCalled();
      const err = (next as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0] as ApiError;
      expect(err.statusCode).toBe(400);
      expect(err.errors?.[0]).toMatchObject({ field: "title", message: "Title is required" });
    });
  });
});
