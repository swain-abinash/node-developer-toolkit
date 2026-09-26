import { describe, it, expect, vi } from "vitest";
import {
  HttpStatus,
  getStatusText,
  pick,
  omit,
  sanitize,
  deepClone,
  slugify,
  maskSensitive,
  randomToken,
  capitalize,
  truncate,
  sleep,
  retry,
  timeout,
  batch,
} from "../src/utils/index.js";

describe("Utils Module", () => {
  describe("HTTP Status Utilities", () => {
    it("should provide correct status codes and text", () => {
      expect(HttpStatus.OK).toBe(200);
      expect(HttpStatus.NOT_FOUND).toBe(404);
      expect(HttpStatus.INTERNAL_SERVER_ERROR).toBe(500);
      expect(getStatusText(404)).toBe("Not Found");
      expect(getStatusText(201)).toBe("Created");
      expect(getStatusText(999)).toBe("Unknown Status");
    });
  });

  describe("Object Utilities", () => {
    it("pick should return only requested properties", () => {
      const source = { id: 1, name: "Node", secret: "xyz", active: true };
      const picked = pick(source, ["id", "name"]);
      expect(picked).toEqual({ id: 1, name: "Node" });
    });

    it("omit should remove requested properties", () => {
      const source = { id: 1, name: "Node", secret: "xyz" };
      const omitted = omit(source, ["secret"]);
      expect(omitted).toEqual({ id: 1, name: "Node" });
    });

    it("sanitize should recursively strip sensitive fields", () => {
      const data = {
        id: 1,
        password: "plain-text-pass",
        profile: {
          email: "test@example.com",
          token: "jwt-token",
          details: {
            apiKey: "secret-key",
            bio: "Developer",
          },
        },
      };

      const sanitized = sanitize(data);
      expect(sanitized).toEqual({
        id: 1,
        profile: {
          email: "test@example.com",
          details: {
            bio: "Developer",
          },
        },
      });
    });

    it("deepClone should create a distinct copy", () => {
      const original = { a: { b: 2 } };
      const clone = deepClone(original);
      clone.a.b = 99;
      expect(original.a.b).toBe(2);
    });
  });

  describe("String Utilities", () => {
    it("slugify should create clean URL slugs", () => {
      expect(slugify("Hello World & Express 2026!")).toBe("hello-world-express-2026");
      expect(slugify("Café au Lait")).toBe("cafe-au-lait");
    });

    it("maskSensitive should mask emails and strings securely", () => {
      expect(maskSensitive("abinash@example.com")).toBe("a*****h@example.com");
      expect(maskSensitive("1234567890123456", 4)).toBe("1234********3456");
    });

    it("randomToken should generate hex tokens of requested length", () => {
      const token16 = randomToken(16);
      expect(token16.length).toBe(16);
      expect(typeof token16).toBe("string");
    });

    it("capitalize should capitalize first letter", () => {
      expect(capitalize("express")).toBe("Express");
    });

    it("truncate should shorten string and add suffix", () => {
      expect(truncate("This is a long string", 10)).toBe("This is...");
    });
  });

  describe("Async Utilities", () => {
    it("sleep should delay execution", async () => {
      const start = Date.now();
      await sleep(50);
      expect(Date.now() - start).toBeGreaterThanOrEqual(40);
    });

    it("retry should succeed if function passes on subsequent attempt", async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts < 2) throw new Error("Temporary error");
        return "Success";
      };

      const result = await retry(fn, { retries: 2, delay: 10, backoff: 1 });
      expect(result).toBe("Success");
      expect(attempts).toBe(2);
    });

    it("retry should throw if retries are exhausted", async () => {
      const fn = async () => {
        throw new Error("Permanent error");
      };

      await expect(retry(fn, { retries: 2, delay: 5, backoff: 1 })).rejects.toThrow("Permanent error");
    });

    it("timeout should reject if promise takes too long", async () => {
      const slowPromise = new Promise((resolve) => setTimeout(resolve, 200));
      await expect(timeout(slowPromise, 50, "Timed out")).rejects.toThrow("Timed out");
    });

    it("batch should process items in concurrency chunks", async () => {
      const items = [1, 2, 3, 4, 5];
      const results = await batch(items, 2, async (item) => item * 10);
      expect(results).toEqual([10, 20, 30, 40, 50]);
    });
  });
});
