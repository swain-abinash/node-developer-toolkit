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
  parsePagination,
  paginateArray,
  HttpStatus,
  maskSensitive,
  randomToken,
} from "../src/index.js";

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Built-in body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. HTTP request logging middleware (with auto response time & status color coding)
app.use(requestLogger({ skip: ["/health"] }));

// 3. Response enhancer middleware (adds res.apiSuccess, res.apiPaginated to Express)
app.use(responseEnhancer());

// Mock in-memory database
interface User {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  createdAt: string;
}

const usersDb: User[] = [
  { id: "1", name: "Abinash", email: "abinash@example.com", role: "admin", createdAt: "2026-01-01" },
  { id: "2", name: "Sarah Connor", email: "sarah@resistance.com", role: "user", createdAt: "2026-01-02" },
  { id: "3", name: "John Doe", email: "john.doe@domain.com", role: "user", createdAt: "2026-01-03" },
  { id: "4", name: "Jane Smith", email: "jane@company.org", role: "user", createdAt: "2026-01-04" },
  { id: "5", name: "Alex Mercer", email: "alex@prototype.dev", role: "admin", createdAt: "2026-01-05" },
];

// Health Check Route
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// GET /api/v1/users - Paginated User List
app.get(
  "/api/v1/users",
  asyncHandler(async (req, res) => {
    const paginationParams = parsePagination(req.query, {
      defaultLimit: 2,
      maxLimit: 10,
    });

    const { items, pagination } = paginateArray(usersDb, paginationParams);

    // Mask sensitive emails before responding
    const safeUsers = items.map((u) => ({
      ...u,
      email: maskSensitive(u.email),
    }));

    return ApiResponse.paginated(res, {
      data: safeUsers,
      pagination,
      message: "Users fetched successfully",
    });
  })
);

// GET /api/v1/users/:id - Single User by ID
app.get(
  "/api/v1/users/:id",
  asyncHandler(async (req, res) => {
    const user = usersDb.find((u) => u.id === req.params.id);

    if (!user) {
      throw ApiError.notFound(`User with ID '${req.params.id}' was not found`);
    }

    return ApiResponse.success(res, {
      data: {
        ...user,
        email: maskSensitive(user.email),
      },
      message: "User retrieved successfully",
    });
  })
);

// POST /api/v1/users - Create User with Request Validation
app.post(
  "/api/v1/users",
  validate({
    body: {
      name: { type: "string", required: true, minLength: 2, maxLength: 50 },
      email: { type: "email", required: true },
      role: { enum: ["user", "admin"], required: false },
    },
  }),
  asyncHandler(async (req, res) => {
    const { name, email, role = "user" } = req.body;

    const existing = usersDb.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      throw ApiError.conflict("User with this email already exists");
    }

    const newUser: User = {
      id: randomToken(8),
      name,
      email,
      role,
      createdAt: new Date().toISOString(),
    };

    usersDb.push(newUser);
    logger.info(`New user registered: ${newUser.name} (${newUser.id})`);

    return ApiResponse.created(res, {
      data: newUser,
      message: "User account created successfully",
    });
  })
);

// Trigger Test Error Route
app.get(
  "/api/v1/crash-test",
  asyncHandler(async () => {
    throw new Error("Simulated unexpected database connection failure");
  })
);

// 4. 404 Route Not Found Handler (Must be registered after all valid routes)
app.use(notFoundHandler());

// 5. Global Standardized Error Handler (Must be the last middleware in the chain)
app.use(
  errorHandler({
    showStack: process.env.NODE_ENV !== "production",
  })
);

// Start Server
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    logger.info(`🚀 Server running in ${process.env.NODE_ENV || "development"} mode on http://localhost:${PORT}`);
    logger.info(`📌 Try testing routes:`);
    logger.info(`   - GET  http://localhost:${PORT}/api/v1/users?page=1&limit=2`);
    logger.info(`   - POST http://localhost:${PORT}/api/v1/users`);
    logger.info(`   - GET  http://localhost:${PORT}/api/v1/crash-test`);
    logger.info(`   - GET  http://localhost:${PORT}/api/v1/non-existent-route`);
  });
}

export default app;
