/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE SHARED — LOGGER (WORLD #1 FINAL)                               */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/shared/logger.ts                                        */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Logger applicatif central                                              */
/*   - Logs structurés JSON                                                   */
/*   - Corrélation requestId                                                  */
/*   - Redaction automatique des secrets                                      */
/*   - Sécurité production                                                    */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Request } from "express";
import { ENV } from "../config/env";

/* -------------------------------------------------------------------------- */
/* TYPES OFFICIELS                                                            */
/* -------------------------------------------------------------------------- */

export type LogLevel =
  | "trace"
  | "debug"
  | "info"
  | "warn"
  | "error"
  | "fatal";

export interface LogPayload {
  message: string;
  requestId?: string;
  context?: Record<string, unknown>;
  error?: unknown;
}

/* -------------------------------------------------------------------------- */
/* LOG LEVEL PRIORITY                                                         */
/* -------------------------------------------------------------------------- */

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

const CURRENT_LEVEL: LogLevel =
  (ENV.LOG_LEVEL as LogLevel) ?? "info";

/* -------------------------------------------------------------------------- */
/* INTERNAL UTILITIES                                                         */
/* -------------------------------------------------------------------------- */

const now = (): string => new Date().toISOString();
const isProduction = ENV.NODE_ENV === "production";

/* -------------------------------------------------------------------------- */
/* REDACTION                                                                  */
/* -------------------------------------------------------------------------- */

const SENSITIVE_KEYS = [
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
  "apiKey",
];

const redact = (value: unknown): unknown => {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(redact);
  }

  const output: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    if (
      SENSITIVE_KEYS.some((k) =>
        key.toLowerCase().includes(k)
      )
    ) {
      output[key] = "***REDACTED***";
    } else {
      output[key] = redact(val);
    }
  }

  return output;
};

/* -------------------------------------------------------------------------- */
/* CORE LOGGER                                                                */
/* -------------------------------------------------------------------------- */

class Logger {
  /* ======================================================================== */
  /* LEVEL CHECK                                                              */
  /* ======================================================================== */

  private shouldLog(level: LogLevel): boolean {
    return (
      LEVEL_PRIORITY[level] >=
      LEVEL_PRIORITY[CURRENT_LEVEL]
    );
  }

  /* ======================================================================== */
  /* INTERNAL WRITE                                                           */
  /* ======================================================================== */

  private write(level: LogLevel, payload: LogPayload): void {
    if (!this.shouldLog(level)) return;

    const entry = {
      timestamp: now(),
      level,
      message: payload.message,
      requestId: payload.requestId,
      context: payload.context
        ? redact(payload.context)
        : undefined,
      error:
        payload.error instanceof Error
          ? {
              name: payload.error.name,
              message: payload.error.message,
              stack: isProduction
                ? undefined
                : payload.error.stack,
            }
          : payload.error
          ? redact(payload.error)
          : undefined,
    };

    const output = JSON.stringify(entry);

    switch (level) {
      case "trace":
      case "debug":
        if (!isProduction) console.debug(output);
        break;
      case "info":
        console.info(output);
        break;
      case "warn":
        console.warn(output);
        break;
      case "error":
      case "fatal":
        console.error(output);
        break;
    }
  }

  /* ======================================================================== */
  /* GLOBAL LOGGER                                                            */
  /* ======================================================================== */

  trace(message: string, context?: Record<string, unknown>): void {
    this.write("trace", { message, context });
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.write("debug", { message, context });
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.write("info", { message, context });
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.write("warn", { message, context });
  }

  error(
    message: string,
    error?: unknown,
    context?: Record<string, unknown>
  ): void {
    this.write("error", { message, error, context });
  }

  fatal(
    message: string,
    error?: unknown,
    context?: Record<string, unknown>
  ): void {
    this.write("fatal", { message, error, context });
  }

  /* ======================================================================== */
  /* REQUEST-AWARE LOGGER                                                     */
  /* ======================================================================== */

  withRequest(req: Request) {
    const requestId =
      (req as any).context?.meta?.requestId;

    return {
      trace: (
        message: string,
        context?: Record<string, unknown>
      ) =>
        this.write("trace", {
          message,
          context,
          requestId,
        }),

      debug: (
        message: string,
        context?: Record<string, unknown>
      ) =>
        this.write("debug", {
          message,
          context,
          requestId,
        }),

      info: (
        message: string,
        context?: Record<string, unknown>
      ) =>
        this.write("info", {
          message,
          context,
          requestId,
        }),

      warn: (
        message: string,
        context?: Record<string, unknown>
      ) =>
        this.write("warn", {
          message,
          context,
          requestId,
        }),

      error: (
        message: string,
        error?: unknown,
        context?: Record<string, unknown>
      ) =>
        this.write("error", {
          message,
          error,
          context,
          requestId,
        }),

      fatal: (
        message: string,
        error?: unknown,
        context?: Record<string, unknown>
      ) =>
        this.write("fatal", {
          message,
          error,
          context,
          requestId,
        }),
    };
  }
}

/* -------------------------------------------------------------------------- */
/* SINGLETON EXPORT                                                           */
/* -------------------------------------------------------------------------- */

export const logger = new Logger();
