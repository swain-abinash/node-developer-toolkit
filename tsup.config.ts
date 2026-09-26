import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "logger/index": "src/logger/index.ts",
    "errors/index": "src/errors/index.ts",
    "response/index": "src/response/index.ts",
    "async-handler/index": "src/async-handler/index.ts",
    "pagination/index": "src/pagination/index.ts",
    "validator/index": "src/validator/index.ts",
    "utils/index": "src/utils/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  outExtension({ format }) {
    return {
      js: format === "esm" ? ".js" : ".cjs",
    };
  },
});
