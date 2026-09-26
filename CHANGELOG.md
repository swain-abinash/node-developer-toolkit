# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-09-26

### Added
- **Core Engine**: Modern dual ESM & CommonJS build using `tsup` with complete `.d.ts` declaration maps and sourcemaps.
- **Logger Module**:
  - Structured console logger with 5 log levels (`debug`, `http`, `info`, `warn`, `error`).
  - Colorized console formatting for development and standard JSON format for cloud aggregators (ELK, CloudWatch, Datadog).
  - `requestLogger` Express middleware with response timing and status-coded ANSI output.
- **Error Handling Module**:
  - `ApiError` class extending native `Error` with HTTP status codes, operational flags, and static factories (`badRequest`, `unauthorized`, `forbidden`, `notFound`, `conflict`, `unprocessable`, `tooManyRequests`, `internal`).
  - `errorHandler` Express middleware with stack trace controls and custom reporting hooks.
  - `notFoundHandler` middleware for 404 routes.
- **Response Formatter Module**:
  - `ApiResponse` with `success`, `created`, `noContent`, `paginated`, and `format` methods.
  - `responseEnhancer` Express middleware decorating `res.apiSuccess()`, `res.apiCreated()`, `res.apiPaginated()`.
- **Async Handler Module**:
  - `asyncHandler` and `asyncHandlers` removing boilerplate `try/catch` in Express route handlers.
- **Pagination Module**:
  - `parsePagination` with safe limit clamping and sanitization.
  - `createPaginationMeta` and `paginateArray` for in-memory and database pagination.
  - `toMongooseSort` helper.
- **Validation Module**:
  - Zero-dependency schema validation engine supporting types, lengths, bounds, regex, email, uuid, url, enums, and custom async rules.
  - `validate` Express middleware with Zod & Joi compatibility.
- **Utility Helpers**:
  - `HttpStatus` constants and `getStatusText`.
  - Object helpers: `pick`, `omit`, `sanitize`, `deepClone`.
  - String helpers: `slugify`, `maskSensitive`, `randomToken`, `capitalize`, `truncate`.
  - Async helpers: `sleep`, `retry` with exponential backoff, `timeout`, `batch`.
