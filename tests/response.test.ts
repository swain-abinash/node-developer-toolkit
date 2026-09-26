import { describe, it, expect, vi } from "vitest";
import {
  ApiResponse,
  sendSuccess,
  sendCreated,
  sendPaginated,
  responseEnhancer,
} from "../src/response/index.js";
import type { Request, Response, NextFunction } from "express";

function createMockResponse() {
  const res: Partial<Response> = {
    statusCode: 200,
  };
  res.status = vi.fn().mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = vi.fn().mockImplementation((data: unknown) => {
    (res as { body?: unknown }).body = data;
    return res;
  });
  res.send = vi.fn().mockImplementation(() => res);
  return res as Response & { body?: unknown };
}

describe("Response Formatter Module", () => {
  describe("ApiResponse.format", () => {
    it("should format response correctly without sending HTTP", () => {
      const formatted = ApiResponse.format({
        data: { id: 1, name: "Antigravity" },
        message: "Fetched successfully",
        statusCode: 200,
      });

      expect(formatted.success).toBe(true);
      expect(formatted.statusCode).toBe(200);
      expect(formatted.message).toBe("Fetched successfully");
      expect(formatted.data).toEqual({ id: 1, name: "Antigravity" });
      expect(formatted.timestamp).toBeDefined();
    });
  });

  describe("ApiResponse.success", () => {
    it("should send status 200 and standard payload", () => {
      const res = createMockResponse();
      ApiResponse.success(res, { data: [1, 2, 3], message: "List loaded" });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      expect(res.body).toMatchObject({
        success: true,
        statusCode: 200,
        message: "List loaded",
        data: [1, 2, 3],
      });
    });
  });

  describe("ApiResponse.created", () => {
    it("should send status 201 Created", () => {
      const res = createMockResponse();
      ApiResponse.created(res, { data: { id: 101 } });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.body).toMatchObject({
        success: true,
        statusCode: 201,
        message: "Resource created successfully",
        data: { id: 101 },
      });
    });
  });

  describe("ApiResponse.noContent", () => {
    it("should send status 204 No Content with empty body", () => {
      const res = createMockResponse();
      ApiResponse.noContent(res);

      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });
  });

  describe("ApiResponse.paginated", () => {
    it("should format paginated data with meta", () => {
      const res = createMockResponse();
      const paginationMeta = {
        total: 50,
        page: 1,
        limit: 10,
        totalPages: 5,
        hasNextPage: true,
        hasPrevPage: false,
        nextPage: 2,
        prevPage: null,
      };

      ApiResponse.paginated(res, {
        data: [{ id: 1 }, { id: 2 }],
        pagination: paginationMeta,
        message: "Items list",
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.body).toMatchObject({
        success: true,
        statusCode: 200,
        message: "Items list",
        data: [{ id: 1 }, { id: 2 }],
        meta: {
          pagination: paginationMeta,
        },
      });
    });
  });

  describe("Shorthand functions", () => {
    it("sendSuccess should delegate to ApiResponse.success", () => {
      const res = createMockResponse();
      sendSuccess(res, { key: "value" }, "OK");
      expect(res.body).toMatchObject({
        success: true,
        data: { key: "value" },
        message: "OK",
      });
    });

    it("sendCreated should delegate to ApiResponse.created", () => {
      const res = createMockResponse();
      sendCreated(res, { id: 1 });
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("sendPaginated should delegate to ApiResponse.paginated", () => {
      const res = createMockResponse();
      const meta = {
        total: 10,
        page: 1,
        limit: 5,
        totalPages: 2,
        hasNextPage: true,
        hasPrevPage: false,
        nextPage: 2,
        prevPage: null,
      };
      sendPaginated(res, ["a", "b"], meta);
      expect(res.body).toMatchObject({
        data: ["a", "b"],
        meta: { pagination: meta },
      });
    });
  });

  describe("responseEnhancer middleware", () => {
    it("should decorate res object with apiSuccess, apiCreated, and apiPaginated methods", () => {
      const req = {} as Request;
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      const middleware = responseEnhancer();
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(typeof res.apiSuccess).toBe("function");
      expect(typeof res.apiCreated).toBe("function");
      expect(typeof res.apiPaginated).toBe("function");

      res.apiSuccess({ data: "decorated" });
      expect(res.body).toMatchObject({ data: "decorated" });
    });
  });
});
