import { describe, it, expect } from "vitest";
import {
  parsePagination,
  createPaginationMeta,
  paginateArray,
  toMongooseSort,
} from "../src/pagination/index.js";

describe("Pagination Module", () => {
  describe("parsePagination", () => {
    it("should return default values when query is empty", () => {
      const parsed = parsePagination({});
      expect(parsed).toEqual({
        page: 1,
        limit: 10,
        skip: 0,
        sort: "createdAt",
        order: "desc",
      });
    });

    it("should parse string numbers correctly", () => {
      const parsed = parsePagination({ page: "3", limit: "25", sort: "name", order: "asc" });
      expect(parsed).toEqual({
        page: 3,
        limit: 25,
        skip: 50,
        sort: "name",
        order: "asc",
      });
    });

    it("should clamp limit to maxLimit", () => {
      const parsed = parsePagination({ limit: "500" }, { maxLimit: 50 });
      expect(parsed.limit).toBe(50);
    });

    it("should sanitize invalid/negative page and limit inputs", () => {
      const parsed = parsePagination({ page: "-5", limit: "invalid" }, { defaultLimit: 15 });
      expect(parsed.page).toBe(1);
      expect(parsed.limit).toBe(15);
      expect(parsed.skip).toBe(0);
    });
  });

  describe("createPaginationMeta", () => {
    it("should compute correct pagination properties for first page", () => {
      const meta = createPaginationMeta({ total: 45, page: 1, limit: 10 });
      expect(meta).toEqual({
        total: 45,
        page: 1,
        limit: 10,
        totalPages: 5,
        hasNextPage: true,
        hasPrevPage: false,
        nextPage: 2,
        prevPage: null,
      });
    });

    it("should compute correct pagination properties for middle page", () => {
      const meta = createPaginationMeta({ total: 45, page: 3, limit: 10 });
      expect(meta).toEqual({
        total: 45,
        page: 3,
        limit: 10,
        totalPages: 5,
        hasNextPage: true,
        hasPrevPage: true,
        nextPage: 4,
        prevPage: 2,
      });
    });

    it("should handle empty dataset (total = 0)", () => {
      const meta = createPaginationMeta({ total: 0, page: 1, limit: 10 });
      expect(meta).toEqual({
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
        nextPage: null,
        prevPage: null,
      });
    });
  });

  describe("paginateArray", () => {
    it("should slice array and provide metadata", () => {
      const items = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }));
      const result = paginateArray(items, { page: 2, limit: 10 });

      expect(result.items.length).toBe(10);
      expect(result.items[0].id).toBe(11);
      expect(result.items[9].id).toBe(20);
      expect(result.pagination.total).toBe(25);
      expect(result.pagination.totalPages).toBe(3);
      expect(result.pagination.page).toBe(2);
    });
  });

  describe("toMongooseSort", () => {
    it("should generate proper sort object", () => {
      expect(toMongooseSort("createdAt", "desc")).toEqual({ createdAt: -1 });
      expect(toMongooseSort("name", "asc")).toEqual({ name: 1 });
    });
  });
});
