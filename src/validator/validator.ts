import type {
  ValidationFieldRule,
  ValidationRules,
  ValidationErrorDetail,
} from "../types/index.js";

// Common Regex Patterns
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const URL_REGEX = /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)$/;

/**
 * Validates a single field value against given rule constraints.
 */
export async function validateField(
  value: unknown,
  rule: ValidationFieldRule,
  fieldName: string,
  source: "body" | "query" | "params" | "headers" = "body"
): Promise<ValidationErrorDetail | null> {
  const isMissing = value === undefined || value === null || value === "";

  // 1. Required check
  if (rule.required && isMissing) {
    return {
      field: fieldName,
      source,
      message: rule.message || `${fieldName} is required`,
      received: value,
    };
  }

  // If not required and missing, it's valid
  if (isMissing) {
    return null;
  }

  // 2. Type checks
  if (rule.type) {
    switch (rule.type) {
      case "string":
        if (typeof value !== "string") {
          return {
            field: fieldName,
            source,
            message: rule.message || `${fieldName} must be a string`,
            received: typeof value,
          };
        }
        break;

      case "number": {
        const num = typeof value === "number" ? value : Number(value);
        if (isNaN(num)) {
          return {
            field: fieldName,
            source,
            message: rule.message || `${fieldName} must be a valid number`,
            received: value,
          };
        }
        break;
      }

      case "boolean": {
        const isBool = typeof value === "boolean" || value === "true" || value === "false" || value === 1 || value === 0;
        if (!isBool) {
          return {
            field: fieldName,
            source,
            message: rule.message || `${fieldName} must be a boolean`,
            received: value,
          };
        }
        break;
      }

      case "array":
        if (!Array.isArray(value)) {
          return {
            field: fieldName,
            source,
            message: rule.message || `${fieldName} must be an array`,
            received: typeof value,
          };
        }
        break;

      case "object":
        if (typeof value !== "object" || value === null || Array.isArray(value)) {
          return {
            field: fieldName,
            source,
            message: rule.message || `${fieldName} must be an object`,
            received: typeof value,
          };
        }
        break;

      case "email":
        if (typeof value !== "string" || !EMAIL_REGEX.test(value)) {
          return {
            field: fieldName,
            source,
            message: rule.message || `${fieldName} must be a valid email address`,
            received: value,
          };
        }
        break;

      case "uuid":
        if (typeof value !== "string" || !UUID_REGEX.test(value)) {
          return {
            field: fieldName,
            source,
            message: rule.message || `${fieldName} must be a valid UUID`,
            received: value,
          };
        }
        break;

      case "url":
        if (typeof value !== "string" || !URL_REGEX.test(value)) {
          return {
            field: fieldName,
            source,
            message: rule.message || `${fieldName} must be a valid URL`,
            received: value,
          };
        }
        break;
    }
  }

  // 3. Length checks (string or array)
  if (typeof value === "string" || Array.isArray(value)) {
    if (rule.minLength !== undefined && value.length < rule.minLength) {
      return {
        field: fieldName,
        source,
        message: rule.message || `${fieldName} must be at least ${rule.minLength} characters/items long`,
        received: value.length,
      };
    }
    if (rule.maxLength !== undefined && value.length > rule.maxLength) {
      return {
        field: fieldName,
        source,
        message: rule.message || `${fieldName} cannot exceed ${rule.maxLength} characters/items`,
        received: value.length,
      };
    }
  }

  // 4. Number bounds checks
  if (typeof value === "number" || (typeof value === "string" && !isNaN(Number(value)))) {
    const num = Number(value);
    if (rule.min !== undefined && num < rule.min) {
      return {
        field: fieldName,
        source,
        message: rule.message || `${fieldName} must be at least ${rule.min}`,
        received: num,
      };
    }
    if (rule.max !== undefined && num > rule.max) {
      return {
        field: fieldName,
        source,
        message: rule.message || `${fieldName} cannot exceed ${rule.max}`,
        received: num,
      };
    }
  }

  // 5. Pattern check (regex)
  if (rule.pattern && typeof value === "string") {
    if (!rule.pattern.test(value)) {
      return {
        field: fieldName,
        source,
        message: rule.message || `${fieldName} has an invalid format`,
        received: value,
      };
    }
  }

  // 6. Enum check
  if (rule.enum && !rule.enum.includes(value as string | number)) {
    return {
      field: fieldName,
      source,
      message: rule.message || `${fieldName} must be one of: ${rule.enum.join(", ")}`,
      received: value,
    };
  }

  // 7. Custom validator function
  if (rule.custom) {
    try {
      const customRes = await rule.custom(value);
      if (typeof customRes === "string") {
        return {
          field: fieldName,
          source,
          message: customRes,
          received: value,
        };
      }
      if (customRes === false) {
        return {
          field: fieldName,
          source,
          message: rule.message || `${fieldName} failed custom validation`,
          received: value,
        };
      }
    } catch (customErr: unknown) {
      return {
        field: fieldName,
        source,
        message: (customErr instanceof Error ? customErr.message : undefined) || rule.message || `${fieldName} failed custom validation`,
        received: value,
      };
    }
  }

  return null;
}

/**
 * Validates an object against a ValidationRules map.
 *
 * @example
 * const { valid, errors } = await validateObject(req.body, {
 *   email: { type: 'email', required: true },
 *   age: { type: 'number', min: 18 }
 * });
 */
export async function validateObject(
  data: Record<string, unknown> = {},
  rules: ValidationRules,
  source: "body" | "query" | "params" | "headers" = "body"
): Promise<{ valid: boolean; errors: ValidationErrorDetail[] }> {
  const errors: ValidationErrorDetail[] = [];

  for (const [field, rule] of Object.entries(rules)) {
    const value = data?.[field];
    const err = await validateField(value, rule, field, source);
    if (err) {
      errors.push(err);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
