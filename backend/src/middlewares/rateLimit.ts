/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE MIDDLEWARE — RATE LIMIT (WORLD #1 FINAL)                      */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/middlewares/rateLimit.ts                                */
/* -------------------------------------------------------------------------- */

import { Request, Response, NextFunction } from "express";

import { ENV, isFeatureEnabled } from "../config";
import { logger } from "../shared/logger";
import {
  IdentityKind,
  IdentityRef,
} from "../core/identity/identity.types";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

interface RateLimitEntry {
  timestamps: number[];
  blockedUntil?: number;
}

interface RateLimitPolicy {
  windowMs: number;
  maxRequests: number;
}

/**
 * Typage minimal du contexte injecté dans Request
 * (évite toute dépendance circulaire ou couplage fort)
 */
interface RequestContextLike {
  ip?: string;
  requestId?: string;
  identity?: IdentityRef;
}

/* -------------------------------------------------------------------------- */
/* CONFIGURATION                                                              */
/* -------------------------------------------------------------------------- */

const DEFAULT_POLICY: RateLimitPolicy = {
  windowMs: ENV.RATE_LIMIT_WINDOW_MS,
  maxRequests: ENV.RATE_LIMIT_MAX,
};

const BLOCK_DURATION_MS = 30_000;
const CLEANUP_INTERVAL_MS = 60_000;

/* -------------------------------------------------------------------------- */
/* INTERNAL STATE                                                             */
/* -------------------------------------------------------------------------- */

const store = new Map<string, RateLimitEntry>();

/* -------------------------------------------------------------------------- */
/* UTILITIES                                                                  */
/* -------------------------------------------------------------------------- */

const now = (): number => Date.now();

const cleanupStore = (): void => {
  const threshold = now() - DEFAULT_POLICY.windowMs * 2;

  for (const [key, entry] of store.entries()) {
    const hasRecentTraffic = entry.timestamps.some(
      (t) => t >= threshold
    );

    if (!hasRecentTraffic) {
      store.delete(key);
    }
  }
};

/* Periodic cleanup to prevent memory leak */
setInterval(cleanupStore, CLEANUP_INTERVAL_MS).unref();

/* -------------------------------------------------------------------------- */
/* REQUEST CONTEXT SAFE ACCESS                                                */
/* -------------------------------------------------------------------------- */

const getRequestContext = (
  req: Request
): RequestContextLike | undefined =>
  (req as unknown as { context?: RequestContextLike })
    .context;

/* -------------------------------------------------------------------------- */
/* IDENTITY KEY NORMALIZATION                                                 */
/* -------------------------------------------------------------------------- */

const getIdentityKey = (req: Request): string => {
  const ctx = getRequestContext(req);
  const identity = ctx?.identity;

  if (!identity) {
    return "anonymous";
  }

  switch (identity.kind) {
    case IdentityKind.PERSON:
      return `person:${identity.userId.toHexString()}`;

    case IdentityKind.ORGANIZATION:
      return `org:${identity.organizationId.toHexString()}`;

    case IdentityKind.GUEST:
      return "guest";

    default:
      return "unknown";
  }
};

/* -------------------------------------------------------------------------- */
/* KEY GENERATION                                                             */
/* -------------------------------------------------------------------------- */

const buildRateLimitKey = (req: Request): string => {
  const ctx = getRequestContext(req);

  const ip = ctx?.ip ?? "unknown";
  const identityKey = getIdentityKey(req);
  const route = `${req.method}:${req.baseUrl}${req.path}`;

  return `${ip}|${identityKey}|${route}`;
};

/* -------------------------------------------------------------------------- */
/* CORE ALGORITHM                                                             */
/* -------------------------------------------------------------------------- */

const evaluateRateLimit = (
  entry: RateLimitEntry,
  policy: RateLimitPolicy
): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} => {
  const currentTime = now();
  const windowStart = currentTime - policy.windowMs;

  entry.timestamps = entry.timestamps.filter(
    (t) => t >= windowStart
  );

  if (
    entry.blockedUntil &&
    entry.blockedUntil > currentTime
  ) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.blockedUntil,
    };
  }

  entry.timestamps.push(currentTime);

  if (entry.timestamps.length > policy.maxRequests) {
    entry.blockedUntil =
      currentTime + BLOCK_DURATION_MS;

    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.blockedUntil,
    };
  }

  const remaining =
    policy.maxRequests - entry.timestamps.length;

  const resetAt =
    entry.timestamps[0]! + policy.windowMs;

  return {
    allowed: true,
    remaining,
    resetAt,
  };
};

/* -------------------------------------------------------------------------- */
/* RESPONSE HEADERS                                                           */
/* -------------------------------------------------------------------------- */

const setRateLimitHeaders = (
  res: Response,
  policy: RateLimitPolicy,
  remaining: number,
  resetAt: number
): void => {
  res.setHeader("RateLimit-Limit", policy.maxRequests);
  res.setHeader("RateLimit-Remaining", remaining);
  res.setHeader(
    "RateLimit-Reset",
    Math.ceil(resetAt / 1000)
  );
};

/* -------------------------------------------------------------------------- */
/* MIDDLEWARE                                                                 */
/* -------------------------------------------------------------------------- */

export const rateLimitMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!isFeatureEnabled("RATE_LIMIT_ENABLED")) {
    return next();
  }

  const key = buildRateLimitKey(req);
  const policy = DEFAULT_POLICY;

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  const result = evaluateRateLimit(entry, policy);

  setRateLimitHeaders(
    res,
    policy,
    result.remaining,
    result.resetAt
  );

  if (!result.allowed) {
    const ctx = getRequestContext(req);

    logger.warn("🚦 Rate limit exceeded", {
      key,
      ip: ctx?.ip,
      identity: getIdentityKey(req),
      route: req.originalUrl,
    });

    res.status(429).json({
      success: false,
      error: {
        code: "RATE_LIMITED",
        message:
          "Too many requests — please slow down",
        requestId: ctx?.requestId,
      },
    });

    return;
  }

  next();
};
