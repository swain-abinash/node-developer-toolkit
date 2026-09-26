# 🛠️ Node Developer Toolkit

[![npm version](https://img.shields.io/badge/npm-v1.0.0-blue.svg?style=flat-square)](https://www.npmjs.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-green.svg?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Coverage](https://img.shields.io/badge/Coverage-90%25-brightgreen.svg?style=flat-square)](https://github.com/)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero%20Runtime-success.svg?style=flat-square)](https://github.com/)

A modern, production-grade, zero-runtime-dependency utility toolkit for **Node.js** and **Express** applications. Standardize your API responses, eliminate boilerplate `try/catch` blocks, enforce type-safe request validation, streamline pagination, format structured logs, and handle operational errors with ease.

---

## ⚡ Key Features

- 🎯 **Standardized API Responses (`ApiResponse`)**: Predictable JSON responses (`success`, `created`, `paginated`, `noContent`) across your entire API surface.
- 🛡️ **Operational Error Engine (`ApiError` & `errorHandler`)**: Custom HTTP error classes with factory helpers and a central Express middleware that sanitizes errors in production.
- ⚡ **Async Controller Wrapper (`asyncHandler`)**: Eliminate redundant `try/catch` boilerplate in Express controllers while preserving TypeScript parameter types.
- 📄 **Smart Pagination (`pagination`)**: Parse query strings with safety bounds clamping (`skip`, `limit`, `page`), calculate rich metadata, and paginate arrays or DB queries.
- 🔍 **Zero-Dependency Schema Validator (`validate`)**: Declarative request validation for `body`, `query`, `params`, and `headers` with built-in regex, length checks, email/UUID validation, and Zod/Joi compatibility.
- 📝 **Structured Logger & HTTP Middleware (`logger`, `requestLogger`)**: Colorized terminal output for development, JSON logs for cloud aggregators (Datadog/CloudWatch), and Express request timing middleware.
- 🧰 **Essential Utilities & HTTP Status**: `HttpStatus` constants, object utilities (`pick`, `omit`, `sanitize`), string helpers (`slugify`, `maskSensitive`, `randomToken`), and async utilities (`sleep`, `retry` with exponential backoff, `timeout`, `batch`).
- 📦 **Dual ESM & CommonJS**: Full tree-shaking support with generated `.d.ts` declaration maps.

---

## 📦 Installation

```bash
# Using npm
npm install @abinashswain/node-developer-toolkit
```

*(Express is an optional peer dependency: `npm install express`)*

---

## 🚀 Quick Start (in 30 seconds)

```typescript
import express from "express";
import {
  logger,
  requestLogger,
  responseEnhancer,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  ApiResponse,
  ApiError,
  validate,
} from "node-developer-toolkit";

const app = express();
app.use(express.json());
app.use(requestLogger()); // Logs incoming HTTP requests with latency & status color
app.use(responseEnhancer()); // Attaches res.apiSuccess(), res.apiCreated()

// 1. Controller with auto async error catching and validation
app.post(
  "/api/v1/users",
  validate({
    body: {
      name: { type: "string", required: true, minLength: 2 },
      email: { type: "email", required: true },
    },
  }),
  asyncHandler(async (req, res) => {
    const { name, email } = req.body;
    // Business logic...
    return ApiResponse.created(res, {
      data: { id: "u_123", name, email },
      message: "User registered successfully",
    });
  })
);

// 2. 404 Route Not Found & Global Error Handler
app.use(notFoundHandler());
app.use(errorHandler());

app.listen(3000, () => logger.info("Server active on http://localhost:3000"));
```

---

## 📚 Detailed Module Guide

### 1. 📝 Logger & Request Logger

Provides 5 log levels (`debug`, `http`, `info`, `warn`, `error`), pretty ANSI colors in development, structured JSON output in production, child logger support, and Express HTTP request logging with duration tracking.

```typescript
import { logger, createLogger, requestLogger } from "node-developer-toolkit/logger";

// Standard Logging
logger.info("Application initialized");
logger.warn("Memory usage above threshold", { usage: "85%" });
logger.error("Database connection dropped", new Error("Timeout"));

// Custom Service Logger
const authLogger = logger.child("AUTH-SERVICE");
authLogger.info("User session verified", { userId: 42 });

// Express Request Logging Middleware
app.use(requestLogger({
  skip: ["/health", "/metrics"], // Skip high-frequency healthchecks
}));
```

---

### 2. 🎯 Standardized API Response (`ApiResponse`)

Ensure every endpoint in your backend returns a uniform, predictable contract:

```typescript
import { ApiResponse, sendSuccess, sendCreated, sendPaginated } from "node-developer-toolkit/response";

// Send 200 OK with data & custom message
ApiResponse.success(res, {
  data: { user: { id: 1, name: "Abinash" } },
  message: "Profile retrieved successfully",
});

// Output:
// {
//   "success": true,
//   "statusCode": 200,
//   "message": "Profile retrieved successfully",
//   "data": { "user": { "id": 1, "name": "Abinash" } },
//   "timestamp": "2026-09-26T15:30:00.000Z"
// }

// Send 201 Created
ApiResponse.created(res, { data: newRecord, message: "Created" });

// Send 204 No Content
ApiResponse.noContent(res);

// Send Paginated Data
ApiResponse.paginated(res, {
  data: usersList,
  pagination: paginationMeta,
  message: "Users loaded",
});
```

---

### 3. 🛡️ Operational Errors & Global Error Handler

Distinguish between expected client/operational errors and unexpected crashes. Automatically hides sensitive stack traces in production.

```typescript
import { ApiError, errorHandler, notFoundHandler } from "node-developer-toolkit/errors";

// Throw clean operational HTTP errors anywhere in your controllers/services:
throw ApiError.badRequest("Invalid password", [{ field: "password", message: "Too weak" }]);
throw ApiError.unauthorized("Authentication token expired");
throw ApiError.forbidden("You do not have access to this resource");
throw ApiError.notFound("User not found");
throw ApiError.conflict("Email already registered");
throw ApiError.unprocessable("Invalid file format");
throw ApiError.tooManyRequests("Rate limit reached");

// In Express setup:
app.use(notFoundHandler()); // Catches unmatched 404 routes
app.use(errorHandler({
  showStack: process.env.NODE_ENV !== "production",
  onError: (err, req) => {
    // Optional: send to Sentry / Datadog
  }
}));
```

---

### 4. ⚡ Async Handler (`asyncHandler`)

Stop writing `try { ... } catch (err) { next(err) }` on every Express route:

```typescript
import { asyncHandler } from "node-developer-toolkit/async-handler";

app.get("/items/:id", asyncHandler(async (req, res) => {
  const item = await findItem(req.params.id);
  if (!item) throw ApiError.notFound("Item does not exist");
  return ApiResponse.success(res, { data: item });
}));
```

---

### 5. 📄 Pagination Utility (`pagination`)

Parse, validate, and clamp query parameters to prevent database overloading, and compute standardized metadata:

```typescript
import { parsePagination, createPaginationMeta, paginateArray } from "node-developer-toolkit/pagination";

app.get("/api/products", asyncHandler(async (req, res) => {
  // 1. Parse & clamp query parameters safely
  const { page, limit, skip, sort, order } = parsePagination(req.query, {
    defaultLimit: 10,
    maxLimit: 100, // Clamps limit to 100 max even if client sends ?limit=999999
    defaultSort: "createdAt",
  });

  // 2. Query your database (e.g. Prisma / Mongoose / SQL)
  const [products, total] = await Promise.all([
    db.product.findMany({ skip, take: limit, orderBy: { [sort]: order } }),
    db.product.count(),
  ]);

  // 3. Generate pagination metadata
  const pagination = createPaginationMeta({ total, page, limit });

  return ApiResponse.paginated(res, {
    data: products,
    pagination,
  });
}));
```

---

### 6. 🔍 Declarative Schema Validation (`validate`)

Zero-dependency lightweight validation middleware with support for email, uuid, url, numbers, strings, enums, regex, and async custom checks:

```typescript
import { validate } from "node-developer-toolkit/validator";

app.post(
  "/api/articles",
  validate({
    body: {
      title: { type: "string", required: true, minLength: 5, maxLength: 100 },
      slug: { pattern: /^[a-z0-9-]+$/, message: "Slug must be alphanumeric with dashes" },
      status: { enum: ["draft", "published", "archived"] },
      authorEmail: { type: "email", required: true },
      tags: { type: "array", required: false },
    },
    query: {
      draft: { type: "boolean" },
    },
  }),
  asyncHandler(async (req, res) => {
    // req.body is guaranteed valid here!
    return ApiResponse.created(res, { data: req.body });
  })
);
```

---

### 7. 🧰 Utility Helpers & HTTP Status

```typescript
import {
  HttpStatus,
  getStatusText,
  pick,
  omit,
  sanitize,
  slugify,
  maskSensitive,
  randomToken,
  sleep,
  retry,
  timeout,
  batch,
} from "node-developer-toolkit/utils";

// HTTP Status
console.log(HttpStatus.OK); // 200
console.log(getStatusText(404)); // "Not Found"

// Object manipulation
const safeUser = pick(user, ["id", "name", "email"]);
const withoutPass = omit(user, ["password", "salt"]);
const cleanPayload = sanitize(req.body); // Strips sensitive keys like 'password', 'token'

// Strings
slugify("Node.js Developer Toolkit v1.0!"); // "nodejs-developer-toolkit-v10"
maskSensitive("abinash@example.com"); // "a*****h@example.com"
maskSensitive("4111222233334444", 4); // "4111********4444"
randomToken(16); // "3f8b0e..."

// Async Helpers
await sleep(1000); // 1-second pause

// Exponential backoff retry for third-party APIs
const result = await retry(() => fetchExternalApi(), {
  retries: 3,
  delay: 500,
  backoff: 2,
});

// Concurrency Batch runner
const results = await batch(userIds, 10, async (id) => syncUser(id));
```

---

## 🧪 Testing & Code Quality

The toolkit is thoroughly tested with **Vitest**:

```bash
# Run unit tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run TypeScript type check
npm run lint

# Build ESM & CommonJS bundles
npm run build
```

---

## 🚀 How to Publish to NPM

### Step 1: Login to NPM in your terminal
```bash
npm login
```
*(Enter your npm username, password, and email OTP)*

### Step 2: Set package name & author in `package.json`
If you want to publish under your own scoped username:
Edit `package.json`:
```json
{
  "name": "@abinash/node-toolkit"
}
```

### Step 3: Run the automated pre-publish test & build
```bash
npm run prepublishOnly
```

### Step 4: Publish to the NPM Registry!
```bash
# For scoped packages (e.g., @abinash/node-toolkit):
npm publish --access public

# For non-scoped packages:
npm publish
```

---

## 💼 Resume & LinkedIn Portfolio Showcase

Add this project to your resume and portfolio:

> **Node.js Developer Toolkit — Open Source npm Package**  
> *TypeScript, Node.js, Express, Vitest, tsup, CI/CD*  
> - Engineered and published an open-source utility toolkit on npm providing standardized API responses, operational error handling, structured logging, safe pagination, and declarative schema validation for Node.js/Express backends.  
> - Designed dual ESM & CommonJS distribution bundles using `tsup` and TypeScript with 100% strict type definitions and tree-shaking support.  
> - Implemented comprehensive unit testing suite with Vitest achieving 90%+ code coverage across all core modules.  
> - Configured automated GitHub Actions CI/CD workflows for multi-version Node.js matrix testing and zero-downtime npm releases.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
