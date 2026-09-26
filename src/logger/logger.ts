import type { LogLevel, LoggerOptions } from "../types/index.js";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  http: 1,
  info: 2,
  warn: 3,
  error: 4,
  silent: 5,
};

// ANSI Color Codes
const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  gray: "\x1b[90m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
};

const LEVEL_COLORS: Record<Exclude<LogLevel, "silent">, string> = {
  debug: COLORS.magenta,
  http: COLORS.cyan,
  info: COLORS.green,
  warn: COLORS.yellow,
  error: COLORS.red,
};

export class Logger {
  private level: LogLevel;
  private format: "pretty" | "json";
  private serviceName?: string;
  private timestamp: boolean;

  constructor(options: LoggerOptions = {}) {
    const isProd = process.env.NODE_ENV === "production";
    this.level = options.level ?? (isProd ? "info" : "debug");
    this.format = options.format ?? (isProd ? "json" : "pretty");
    this.serviceName = options.serviceName;
    this.timestamp = options.timestamp ?? true;
  }

  /**
   * Sets minimum log level dynamically
   */
  public setLevel(level: LogLevel): this {
    this.level = level;
    return this;
  }

  /**
   * Sets output format ('pretty' | 'json')
   */
  public setFormat(format: "pretty" | "json"): this {
    this.format = format;
    return this;
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[this.level];
  }

  private formatMessage(
    level: Exclude<LogLevel, "silent">,
    message: string,
    meta?: unknown
  ): string {
    const isoTime = new Date().toISOString();

    if (this.format === "json") {
      const payload: Record<string, unknown> = {
        timestamp: this.timestamp ? isoTime : undefined,
        level: level.toUpperCase(),
        service: this.serviceName,
        message,
      };

      if (meta !== undefined) {
        if (meta instanceof Error) {
          payload.error = {
            name: meta.name,
            message: meta.message,
            stack: meta.stack,
          };
        } else {
          payload.meta = meta;
        }
      }

      return JSON.stringify(payload);
    }

    // Pretty console format
    const timeStr = this.timestamp
      ? `${COLORS.gray}[${isoTime}]${COLORS.reset} `
      : "";
    const color = LEVEL_COLORS[level];
    const badge = `${color}${COLORS.bold}[${level.toUpperCase().padEnd(5)}]${COLORS.reset}`;
    const serviceStr = this.serviceName
      ? ` ${COLORS.blue}[${this.serviceName}]${COLORS.reset}`
      : "";

    let out = `${timeStr}${badge}${serviceStr} ${message}`;

    if (meta !== undefined) {
      if (meta instanceof Error) {
        out += `\n${COLORS.red}${meta.stack || meta.message}${COLORS.reset}`;
      } else if (typeof meta === "object" && meta !== null) {
        out += `\n${COLORS.gray}${JSON.stringify(meta, null, 2)}${COLORS.reset}`;
      } else {
        out += ` ${COLORS.gray}${String(meta)}${COLORS.reset}`;
      }
    }

    return out;
  }

  public debug(message: string, meta?: unknown): void {
    if (!this.shouldLog("debug")) return;
    console.debug(this.formatMessage("debug", message, meta));
  }

  public http(message: string, meta?: unknown): void {
    if (!this.shouldLog("http")) return;
    console.log(this.formatMessage("http", message, meta));
  }

  public info(message: string, meta?: unknown): void {
    if (!this.shouldLog("info")) return;
    console.info(this.formatMessage("info", message, meta));
  }

  public warn(message: string, meta?: unknown): void {
    if (!this.shouldLog("warn")) return;
    console.warn(this.formatMessage("warn", message, meta));
  }

  public error(message: string, meta?: unknown): void {
    if (!this.shouldLog("error")) return;
    console.error(this.formatMessage("error", message, meta));
  }

  /**
   * Spawns a child logger with a dedicated service name
   */
  public child(serviceName: string, options: Partial<LoggerOptions> = {}): Logger {
    return new Logger({
      level: options.level ?? this.level,
      format: options.format ?? this.format,
      timestamp: options.timestamp ?? this.timestamp,
      serviceName: this.serviceName ? `${this.serviceName}:${serviceName}` : serviceName,
    });
  }
}

/**
 * Default global logger singleton
 */
export const logger = new Logger();

/**
 * Factory function to create custom logger instances
 */
export function createLogger(options?: LoggerOptions): Logger {
  return new Logger(options);
}
