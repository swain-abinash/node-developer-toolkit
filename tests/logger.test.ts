import { describe, it, expect, vi, beforeEach } from "vitest";
import { Logger, createLogger, requestLogger } from "../src/logger/index.js";
import type { Request, Response } from "express";

describe("Logger Module", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should log info messages when level is info", () => {
    const consoleSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const log = new Logger({ level: "info", format: "pretty", timestamp: false });

    log.info("Test info message");
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy.mock.calls[0][0]).toContain("[INFO ]");
    expect(consoleSpy.mock.calls[0][0]).toContain("Test info message");
  });

  it("should suppress debug logs when level is set to warn", () => {
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const log = new Logger({ level: "warn" });

    log.debug("Hidden debug");
    log.warn("Visible warn");

    expect(debugSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("should output valid JSON when format is set to json", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const log = new Logger({ level: "debug", format: "json", serviceName: "USER-SERVICE" });

    log.error("Database connection failed", { code: 5001 });

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const output = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(output.level).toBe("ERROR");
    expect(output.service).toBe("USER-SERVICE");
    expect(output.message).toBe("Database connection failed");
    expect(output.meta).toEqual({ code: 5001 });
    expect(output.timestamp).toBeDefined();
  });

  it("should format Error instances in meta properly", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const log = new Logger({ format: "json" });
    const testErr = new Error("Something broke");

    log.error("Fatal error", testErr);
    const output = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(output.error.message).toBe("Something broke");
    expect(output.error.name).toBe("Error");
  });

  it("should create child loggers with nested service prefixes", () => {
    const consoleSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const parent = new Logger({ serviceName: "API" });
    const child = parent.child("PAYMENTS");

    child.info("Payment processed");
    expect(consoleSpy.mock.calls[0][0]).toContain("[API:PAYMENTS]");
  });

  it("should create logger instance via createLogger factory", () => {
    const customLog = createLogger({ level: "silent" });
    expect(customLog).toBeInstanceOf(Logger);
  });

  describe("requestLogger middleware", () => {
    it("should log request completion on finish event", () => {
      const log = new Logger({ level: "debug" });
      const httpSpy = vi.spyOn(log, "http").mockImplementation(() => {});

      const middleware = requestLogger({ logger: log });
      let finishCallback: () => void = () => {};

      const req = {
        method: "GET",
        originalUrl: "/api/v1/users",
        ip: "127.0.0.1",
        get: () => "VitestAgent",
        path: "/api/v1/users",
      } as unknown as Request;

      const res = {
        statusCode: 200,
        on: (event: string, cb: () => void) => {
          if (event === "finish") finishCallback = cb;
        },
      } as unknown as Response;

      const next = vi.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();

      // Trigger response finish
      finishCallback();
      expect(httpSpy).toHaveBeenCalledTimes(1);
      expect(httpSpy.mock.calls[0][0]).toContain("GET /api/v1/users");
      expect(httpSpy.mock.calls[0][0]).toContain("200");
    });

    it("should skip logging for routes matching skip filter", () => {
      const log = new Logger();
      const httpSpy = vi.spyOn(log, "http").mockImplementation(() => {});

      const middleware = requestLogger({ logger: log, skip: ["/health"] });

      const req = {
        path: "/health",
      } as unknown as Request;
      const res = { on: vi.fn() } as unknown as Response;
      const next = vi.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.on).not.toHaveBeenCalled();
      expect(httpSpy).not.toHaveBeenCalled();
    });
  });
});
