import { randomBytes } from "node:crypto";

/**
 * Converts a string into a clean, URL-friendly slug.
 *
 * @example
 * slugify("Node.js Developer Toolkit v1.0!") // "nodejs-developer-toolkit-v10"
 */
export function slugify(text: string, options?: { lowercase?: boolean; separator?: string }): string {
  const { lowercase = true, separator = "-" } = options || {};
  let str = text.normalize("NFKD").replace(/[\u0300-\u036f]/g, ""); // remove accents
  if (lowercase) {
    str = str.toLowerCase();
  }
  return str
    .replace(/[^a-zA-Z0-9\s-_]/g, "") // remove invalid characters
    .trim()
    .replace(/[\s-_]+/g, separator) // replace spaces/hyphens/underscores with separator
    .replace(new RegExp(`^${separator}+|${separator}+$`, "g"), ""); // trim separator
}

/**
 * Masks a sensitive string such as an email, phone number, API key, or credit card.
 *
 * @example
 * maskSensitive("mysecretpassword123", 4) // "myse***************"
 * maskSensitive("user@domain.com") // "u***r@domain.com"
 */
export function maskSensitive(
  value: string,
  visibleEdgeChars = 3,
  maskChar = "*"
): string {
  if (!value) return "";

  // If it looks like an email:
  if (value.includes("@")) {
    const [local, domain] = value.split("@");
    if (!local || !domain) return value;
    if (local.length <= 2) {
      return `${local[0]}${maskChar.repeat(3)}@${domain}`;
    }
    const visibleStart = local.slice(0, 1);
    const visibleEnd = local.slice(-1);
    const masked = maskChar.repeat(Math.max(3, local.length - 2));
    return `${visibleStart}${masked}${visibleEnd}@${domain}`;
  }

  // Generic string masking:
  if (value.length <= visibleEdgeChars * 2) {
    return maskChar.repeat(value.length);
  }

  const start = value.slice(0, visibleEdgeChars);
  const end = value.slice(-visibleEdgeChars);
  const maskedCount = value.length - visibleEdgeChars * 2;
  return `${start}${maskChar.repeat(maskedCount)}${end}`;
}

/**
 * Generates a secure random hex token.
 *
 * @example
 * randomToken(16) // "e4d909c290d0fb1ca068ffaddf22cbd0"
 */
export function randomToken(length = 32): string {
  return randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length);
}

/**
 * Capitalizes the first letter of a string.
 */
export function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Truncates a string to a maximum length and appends a suffix (default: "...").
 */
export function truncate(str: string, maxLength = 50, suffix = "..."): string {
  if (!str || str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
}
