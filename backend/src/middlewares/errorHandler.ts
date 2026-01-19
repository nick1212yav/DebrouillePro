/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE MIDDLEWARE — ERROR HANDLER (WORLD #1 FINAL)                    */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/middlewares/errorHandler.ts                             */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Responsibilities:                                                        */
/*   - Centralize all backend errors                                          */
/*   - Normalize API error responses                                         */
/*   - Protect sensitive information                                         */
/*   - Guarantee request traceability                                        */
/*   - Enable audit & observability                                          */
/*                                                                            */
/*  Guarantees:                                                              */
/*   - No stack trace leakage in production                                   */
/*   - requestId always propagated                                            */
/*   - Strong typing                                                         */
/*   - Deterministic error contracts                                          */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Request, Response, NextFunction } from "express";

import { ENV } from "../config";
import { logger } from "../shared/logger";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Canonical error codes exposed to API consumers.
 * Must remain stable across versions.
 */
export type ErrorCode =
  | "INTERNAL_ERROR"
  | "UNEXPECTED_ERROR"
  | "VALIDATION_ERROR"
  | "DUPLICATE_RESOURCE"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "INVALID_TOKEN"
  | "TOKEN_EXPIRED"
  | "BAD_REQUEST";

/**
 * Standardized API error payload.
 */
export interface ApiErrorPayload {
  code: ErrorCode;
  message: string;
  requestId?: string;
  stack?: string;
}

/* -------------------------------------------------------------------------- */
/* APP ERROR — CANONICAL DOMAIN ERROR                                         */
/* -------------------------------------------------------------------------- */

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;
  readonly isOperational: boolean;
  readonly meta?: Record<string, unknown>;

  constructor(params: {
    message: string;
    statusCode: number;
    code: ErrorCode;
    isOperational?: boolean;
    meta?: Record<string, unknown>;
  }) {
    super(params.message);

    this.statusCode = params.statusCode;
    this.code = params.code;
    this.isOperational = params.isOperational ?? true;
    this.meta = params.meta;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

/* -------------------------------------------------------------------------- */
/* INTERNAL CONSTANTS                                                         */
/* -------------------------------------------------------------------------- */

const isProduction = ENV.IS_PRODUCTION;

/* -------------------------------------------------------------------------- */
/* ERROR NORMALIZATION                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Normalize any unknown error into a safe AppError instance.
 */
const normalizeError = (err: unknown): AppError => {
  if (err instanceof AppError) {
    return err;
  }

  if (err instanceof Error) {
    const anyErr = err as unknown as Record<string, unknown>;

    /* -------------------- MONGOOSE -------------------- */
    if (anyErr.name === "ValidationError") {
      return new AppError({
        message: "Invalid request data",
        statusCode: 400,
        code: "VALIDATION_ERROR",
      });
    }

    if (anyErr.code === 11000) {
      return new AppError({
        message: "Duplicate resource",
        statusCode: 409,
        code: "DUPLICATE_RESOURCE",
      });
    }

    /* -------------------- JWT ------------------------- */
    if (anyErr.name === "JsonWebTokenError") {
      return new AppError({
        message: "Invalid authentication token",
        statusCode: 401,
        code: "INVALID_TOKEN",
      });
    }

    if (anyErr.name === "TokenExpiredError") {
      return new AppError({
        message: "Authentication token expired",
        statusCode: 401,
        code: "TOKEN_EXPIRED",
      });
    }
  }

  /* -------------------- FALLBACK ---------------------- */
  return new AppError({
    message: "Unexpected server error",
    statusCode: 500,
    code: "UNEXPECTED_ERROR",
    isOperational: false,
  });
};

/* -------------------------------------------------------------------------- */
/* REQUEST CONTEXT EXTRACTION                                                 */
/* -------------------------------------------------------------------------- */

interface RequestContextLike {
  requestId?: string;
}

const extractRequestId = (
  req: Request
): string | undefined => {
  const ctx = (req as unknown as { context?: RequestContextLike })
    ?.context;
  return ctx?.requestId;
};

/* -------------------------------------------------------------------------- */
/* ERROR HANDLER MIDDLEWARE                                                   */
/* -------------------------------------------------------------------------- */

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response<ApiErrorPayload>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  const normalized = normalizeError(err);
  const requestId = extractRequestId(req);

  const statusCode = normalized.statusCode;

  /* ====================================================================== */
  /* STRUCTURED LOGGING                                                      */
  /* ====================================================================== */

  const logPayload = {
    requestId,
    statusCode,
    code: normalized.code,
    message: normalized.message,
    path: req.originalUrl,
    method: req.method,
    operational: normalized.isOperational,
    meta: normalized.meta,
    stack:
      !isProduction && normalized.stack
        ? normalized.stack
        : undefined,
  };

  if (statusCode >= 500) {
    logger.error("🔥 SERVER ERROR", logPayload);
  } else {
    logger.warn("⚠️ CLIENT ERROR", logPayload);
  }

  /* ====================================================================== */
  /* API RESPONSE                                                            */
  /* ====================================================================== */

  const payload: ApiErrorPayload = {
    code: normalized.code,
    message: normalized.message,
    requestId,
    ...(isProduction
      ? {}
      : normalized.stack
      ? { stack: normalized.stack }
      : {}),
  };

  res.status(statusCode).json(payload);
};
