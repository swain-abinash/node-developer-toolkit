// JavaScript / CommonJS Example
const express = require("express");
const {
  logger,
  requestLogger,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  ApiResponse,
  ApiError,
  validate,
  parsePagination,
  paginateArray,
} = require("../dist/index.cjs");

const app = express();
app.use(express.json());
app.use(requestLogger());

const items = [
  { id: 1, name: "Toolkit Item 1" },
  { id: 2, name: "Toolkit Item 2" },
  { id: 3, name: "Toolkit Item 3" },
];

app.get(
  "/items",
  asyncHandler(async (req, res) => {
    const pagination = parsePagination(req.query);
    const result = paginateArray(items, pagination);
    return ApiResponse.paginated(res, {
      data: result.items,
      pagination: result.pagination,
      message: "Items loaded",
    });
  })
);

app.post(
  "/items",
  validate({
    body: {
      name: { type: "string", required: true, minLength: 2 },
    },
  }),
  asyncHandler(async (req, res) => {
    const newItem = { id: items.length + 1, name: req.body.name };
    items.push(newItem);
    return ApiResponse.created(res, { data: newItem });
  })
);

app.use(notFoundHandler());
app.use(errorHandler());

const PORT = 3001;
app.listen(PORT, () => {
  logger.info(`CommonJS server running on http://localhost:${PORT}`);
});
