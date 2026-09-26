import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { AsyncRequestHandler } from "../types/index.js";

/**
 * Wraps an async Express route handler or middleware to eliminate repetitive try/catch blocks.
 * Any unhandled promise rejection is caught and forwarded to `next(error)`.
 *
 * @example
 * app.get("/users/:id", asyncHandler(async (req, res) => {
 *   const user = await findUserById(req.params.id);
 *   if (!user) throw ApiError.notFound("User not found");
 *   return ApiResponse.success(res, { data: user });
 * }));
 */
export function asyncHandler<
  P = any,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any
>(
  fn: AsyncRequestHandler<P, ResBody, ReqBody, ReqQuery>
): RequestHandler<P, ResBody, ReqBody, ReqQuery> {
  return (req: Request<P, ResBody, ReqBody, ReqQuery>, res: Response<ResBody>, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Wraps an array of async handlers / middlewares into an array of wrapped handlers.
 *
 * @example
 * router.post("/items", ...asyncHandlers(authMiddleware, validateMiddleware, createItemController));
 */
export function asyncHandlers(
  ...handlers: AsyncRequestHandler[]
): RequestHandler[] {
  return handlers.map((fn) => asyncHandler(fn));
}
