import { describe, it, expect, vi } from "vitest";
import { asyncHandler, asyncHandlers } from "../src/async-handler/index.js";
import type { Request, Response, NextFunction } from "express";

describe("Async Handler Module", () => {
  it("should execute async function without errors", async () => {
    const fn = vi.fn().mockResolvedValue("Success");
    const wrapped = asyncHandler(fn);

    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn();

    wrapped(req, res, next);
    await Promise.resolve();

    expect(fn).toHaveBeenCalledWith(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });

  it("should catch async errors and forward them to next()", async () => {
    const testError = new Error("Async failure");
    const fn = vi.fn().mockRejectedValue(testError);
    const wrapped = asyncHandler(fn);

    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn();

    wrapped(req, res, next);
    await new Promise((r) => setTimeout(r, 10));

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(testError);
  });

  it("should wrap multiple handlers with asyncHandlers", async () => {
    const fn1 = vi.fn().mockResolvedValue(1);
    const fn2 = vi.fn().mockResolvedValue(2);

    const [w1, w2] = asyncHandlers(fn1, fn2);
    expect(typeof w1).toBe("function");
    expect(typeof w2).toBe("function");

    const next = vi.fn();
    w1({} as Request, {} as Response, next);
    await Promise.resolve();
    expect(fn1).toHaveBeenCalled();
  });
});
