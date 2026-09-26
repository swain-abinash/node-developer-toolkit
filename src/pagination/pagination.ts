import type {
  PaginationMeta,
  PaginationOptions,
  ParsedPagination,
  PaginatedResult,
} from "../types/index.js";

export interface PaginationQueryParams {
  page?: string | number | unknown;
  limit?: string | number | unknown;
  sort?: string | unknown;
  order?: "asc" | "desc" | string | unknown;
}

/**
 * Parses, sanitizes, and normalizes pagination query parameters with safe boundary clamping.
 *
 * @example
 * const { page, limit, skip, sort, order } = parsePagination(req.query, {
 *   defaultLimit: 20,
 *   maxLimit: 100,
 *   defaultSort: "createdAt",
 * });
 */
export function parsePagination(
  query: PaginationQueryParams = {},
  options: PaginationOptions = {}
): ParsedPagination {
  const {
    defaultLimit = 10,
    maxLimit = 100,
    defaultSort = "createdAt",
    defaultOrder = "desc",
  } = options;

  let page = parseInt(String(query.page || 1), 10);
  if (isNaN(page) || page < 1) {
    page = 1;
  }

  let limit = parseInt(String(query.limit || defaultLimit), 10);
  if (isNaN(limit) || limit < 1) {
    limit = defaultLimit;
  }
  // Clamp to maxLimit to prevent memory exhaustion / DoS
  if (limit > maxLimit) {
    limit = maxLimit;
  }

  const skip = (page - 1) * limit;

  const sort = typeof query.sort === "string" && query.sort.trim()
    ? query.sort.trim()
    : defaultSort;

  const rawOrder = typeof query.order === "string" ? query.order.toLowerCase() : "";
  const order: "asc" | "desc" = rawOrder === "asc" || rawOrder === "ascending" ? "asc" : defaultOrder;

  return {
    page,
    limit,
    skip,
    sort,
    order,
  };
}

/**
 * Calculates standard pagination metadata given total item count, current page, and page limit.
 *
 * @example
 * const meta = createPaginationMeta({ total: 105, page: 2, limit: 20 });
 * // { total: 105, page: 2, limit: 20, totalPages: 6, hasNextPage: true, hasPrevPage: true, nextPage: 3, prevPage: 1 }
 */
export function createPaginationMeta(params: {
  total: number;
  page: number;
  limit: number;
}): PaginationMeta {
  const total = Math.max(0, Math.floor(params.total));
  const limit = Math.max(1, Math.floor(params.limit));
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  const page = Math.max(1, Math.floor(params.page));

  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1 && page <= (totalPages + 1);

  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage,
    hasPrevPage,
    nextPage: hasNextPage ? page + 1 : null,
    prevPage: hasPrevPage ? page - 1 : null,
  };
}

/**
 * Paginates an in-memory array and generates corresponding pagination metadata.
 *
 * @example
 * const result = paginateArray(usersList, { page: 1, limit: 10 });
 * // result -> { items: [...], pagination: { total, page, limit, totalPages, ... } }
 */
export function paginateArray<T>(
  items: T[],
  paginationParams: { page?: number; limit?: number } = {}
): PaginatedResult<T> {
  const page = Math.max(1, paginationParams.page || 1);
  const limit = Math.max(1, paginationParams.limit || 10);
  const total = items.length;

  const skip = (page - 1) * limit;
  const paginatedItems = items.slice(skip, skip + limit);
  const pagination = createPaginationMeta({ total, page, limit });

  return {
    items: paginatedItems,
    pagination,
  };
}

/**
 * Returns a Mongoose-compatible sort object (e.g. `{ createdAt: -1 }`).
 */
export function toMongooseSort(
  sort: string,
  order: "asc" | "desc" = "desc"
): Record<string, 1 | -1> {
  return {
    [sort]: order === "asc" ? 1 : -1,
  };
}
