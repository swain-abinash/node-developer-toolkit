/**
 * Checks if a value is a non-null object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Creates an object composed of the picked object properties.
 *
 * @example
 * const user = { id: 1, name: "Alice", password: "secret" };
 * const safeUser = pick(user, ["id", "name"]);
 * // safeUser -> { id: 1, name: "Alice" }
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  object: T,
  keys: K[]
): Pick<T, K> {
  if (!isObject(object)) return {} as Pick<T, K>;
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in object && object[key] !== undefined) {
      result[key] = object[key];
    }
  }
  return result;
}

/**
 * Creates an object composed of the own and inherited enumerable string and symbol
 * properties of object that are not omitted.
 *
 * @example
 * const user = { id: 1, name: "Alice", password: "secret" };
 * const publicUser = omit(user, ["password"]);
 * // publicUser -> { id: 1, name: "Alice" }
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  object: T,
  keys: K[]
): Omit<T, K> {
  if (!isObject(object)) return {} as Omit<T, K>;
  const result = { ...object };
  for (const key of keys) {
    delete result[key];
  }
  return result as Omit<T, K>;
}

/**
 * Deep clones any JSON-serializable object or array.
 */
export function deepClone<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(value);
    } catch {
      // fallback if structuredClone fails on certain prototypes
    }
  }
  return JSON.parse(JSON.stringify(value));
}

/**
 * Common sensitive field names that should be stripped or masked by default
 */
export const DEFAULT_SENSITIVE_KEYS = [
  "password",
  "passwordConfirm",
  "token",
  "accessToken",
  "refreshToken",
  "secret",
  "apiKey",
  "creditCard",
  "ssn",
  "cvv",
  "authorization",
];

/**
 * Strips sensitive keys recursively from an object (useful before logging or sending responses).
 *
 * @example
 * const data = { user: { name: 'Bob', password: '123' } };
 * const clean = sanitize(data); // { user: { name: 'Bob' } }
 */
export function sanitize<T>(
  data: T,
  disallowedKeys: string[] = DEFAULT_SENSITIVE_KEYS
): T {
  if (Array.isArray(data)) {
    return data.map((item) => sanitize(item, disallowedKeys)) as unknown as T;
  }

  if (isObject(data)) {
    const cleanObj: Record<string, unknown> = {};
    const lowerDisallowed = disallowedKeys.map((k) => k.toLowerCase());

    for (const [key, value] of Object.entries(data)) {
      if (lowerDisallowed.includes(key.toLowerCase())) {
        continue; // strip key
      }
      cleanObj[key] = isObject(value) || Array.isArray(value) ? sanitize(value, disallowedKeys) : value;
    }
    return cleanObj as T;
  }

  return data;
}
