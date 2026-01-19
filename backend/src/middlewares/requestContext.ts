/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE — REQUEST CONTEXT MIDDLEWARE (WORLD #1 FINAL — STABLE)         */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/middlewares/requestContext.ts                           */
/* -------------------------------------------------------------------------- */

import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type DeviceType = "MOBILE" | "WEB" | "API" | "UNKNOWN";

/**
 * ⚖️ Aligned with business modules (Livraison, Services, Access)
 */
export type AccountType =
  | "PERSON"
  | "ORGANIZATION"
  | "ADMIN"
  | "SYSTEM"
  | "UNKNOWN";

/**
 * 🎭 Unified role model
 */
export type Role =
  | "ADMIN"
  | "STAFF"
  | "MEMBER"
  | "SYSTEM";

/**
 * Identity propagated across the whole request lifecycle.
 */
export interface RequestIdentityContext {
  /**
   * Unique identity id (user / service / system).
   */
  id?: string;

  /**
   * Optional organization scope.
   */
  organizationId?: string;

  /**
   * Logical account category (always defined).
   */
  accountType: AccountType;

  /**
   * Primary role shortcut.
   */
  role?: Role;

  /**
   * Full role set (RBAC / ABAC).
   */
  roles: Role[];
}

export interface RequestContext {
  requestId: string;
  ip: string;
  userAgent?: string;
  locale?: string;
  device: DeviceType;
  startedAt: number;
  identity: RequestIdentityContext;
  meta: Record<string, unknown>;
}

/* -------------------------------------------------------------------------- */
/* EXPRESS AUGMENTATION                                                       */
/* -------------------------------------------------------------------------- */

declare global {
  namespace Express {
    interface Request {
      context: RequestContext;
    }
  }
}

/* -------------------------------------------------------------------------- */
/* INTERNAL UTILITIES                                                         */
/* -------------------------------------------------------------------------- */

const generateRequestId = (req: Request): string => {
  const headerId = req.headers["x-request-id"];
  if (typeof headerId === "string" && headerId.length >= 8) {
    return headerId;
  }
  return crypto.randomUUID();
};

const extractIpAddress = (req: Request): string => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]!.trim();
  }
  return req.socket.remoteAddress ?? "UNKNOWN";
};

const extractLocale = (req: Request): string | undefined => {
  const header = req.headers["accept-language"];
  if (typeof header !== "string" || header.length === 0) {
    return undefined;
  }
  return header.split(",")[0]?.trim();
};

const extractDevice = (req: Request): DeviceType => {
  const raw = req.headers["x-device-type"];
  if (typeof raw !== "string") return "UNKNOWN";

  const normalized = raw.toUpperCase();
  if (normalized === "MOBILE" || normalized === "WEB" || normalized === "API") {
    return normalized;
  }

  return "UNKNOWN";
};

/* -------------------------------------------------------------------------- */
/* MIDDLEWARE                                                                 */
/* -------------------------------------------------------------------------- */

export const requestContextMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestId = generateRequestId(req);
  const ip = extractIpAddress(req);
  const locale = extractLocale(req);
  const device = extractDevice(req);
  const userAgent = req.headers["user-agent"];
  const startedAt = Date.now();

  const context: RequestContext = {
    requestId,
    ip,
    locale,
    device,
    userAgent: typeof userAgent === "string" ? userAgent : undefined,
    startedAt,

    /**
     * ✅ Identity always initialized with safe defaults.
     * Auth middleware will enrich later.
     */
    identity: {
      accountType: "UNKNOWN",
      roles: [],
    },

    meta: {},
  };

  req.context = context;

  try {
    res.setHeader("X-Request-Id", requestId);
  } catch {
    // Never block request
  }

  next();
};

/* -------------------------------------------------------------------------- */
/* EXPORT ALIAS (BACKWARD COMPATIBILITY)                                      */
/* -------------------------------------------------------------------------- */

/**
 * Some modules import `requestContext` instead of `requestContextMiddleware`.
 * This keeps backward compatibility without breaking the codebase.
 */
export const requestContext = requestContextMiddleware;
