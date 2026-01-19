/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE NOTIFICATION — RATE LIMIT RULES (WORLD #1 ANTI-SPAM ENGINE)     */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/notification/rules/rate-limit.rules.ts              */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*  - Empêcher le spam, flood, abus                                           */
/*  - Protéger utilisateurs et opérateurs                                     */
/*  - Adapter dynamiquement selon comportement                                 */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Types } from "mongoose";
import {
  NotificationChannel,
  NotificationUrgency,
} from "../notification.types";

/* -------------------------------------------------------------------------- */
/* RATE CONTEXT                                                               */
/* -------------------------------------------------------------------------- */

export type RateLimitContext = {
  recipientId?: Types.ObjectId;
  ipHash?: string;
  deviceId?: string;

  channel: NotificationChannel;
  urgency: NotificationUrgency;

  now: Date;
};

/* -------------------------------------------------------------------------- */
/* DECISION                                                                   */
/* -------------------------------------------------------------------------- */

export type RateLimitDecision =
  | { allowed: true }
  | {
      allowed: false;
      retryAfterMs: number;
      reason: string;
    };

/* -------------------------------------------------------------------------- */
/* MEMORY STORE (MVP)                                                         */
/* -------------------------------------------------------------------------- */

type Counter = {
  count: number;
  windowStart: number;
};

const store = new Map<string, Counter>();

/* -------------------------------------------------------------------------- */
/* LIMIT POLICIES                                                             */
/* -------------------------------------------------------------------------- */

const LIMITS = {
  SMS: {
    NORMAL: { max: 3, windowMs: 60_000 },
    HIGH: { max: 6, windowMs: 60_000 },
    CRITICAL: { max: 20, windowMs: 60_000 },
  },
  EMAIL: {
    NORMAL: { max: 5, windowMs: 60_000 },
    HIGH: { max: 10, windowMs: 60_000 },
    CRITICAL: { max: 50, windowMs: 60_000 },
  },
  PUSH: {
    NORMAL: { max: 20, windowMs: 60_000 },
    HIGH: { max: 50, windowMs: 60_000 },
    CRITICAL: { max: 200, windowMs: 60_000 },
  },
};

/* -------------------------------------------------------------------------- */
/* ENGINE                                                                     */
/* -------------------------------------------------------------------------- */

export class RateLimitRules {
  /* ======================================================================== */
  /* MAIN CHECK                                                               */
  /* ======================================================================== */

  static evaluate(
    context: RateLimitContext
  ): RateLimitDecision {
    const key = this.buildKey(context);
    const now = context.now.getTime();

    const limits =
      LIMITS[context.channel]?.[
        context.urgency
      ];

    if (!limits) {
      return { allowed: true };
    }

    const entry = store.get(key);

    if (!entry) {
      store.set(key, {
        count: 1,
        windowStart: now,
      });
      return { allowed: true };
    }

    const elapsed = now - entry.windowStart;

    if (elapsed > limits.windowMs) {
      entry.count = 1;
      entry.windowStart = now;
      return { allowed: true };
    }

    entry.count += 1;

    if (entry.count <= limits.max) {
      return { allowed: true };
    }

    return {
      allowed: false,
      retryAfterMs:
        limits.windowMs - elapsed,
      reason: `Rate limit exceeded on ${context.channel}`,
    };
  }

  /* ======================================================================== */
  /* KEY GENERATION                                                           */
  /* ======================================================================== */

  private static buildKey(
    context: RateLimitContext
  ): string {
    return [
      context.channel,
      context.recipientId?.toHexString() ??
        context.deviceId ??
        context.ipHash ??
        "anonymous",
    ].join(":");
  }
}
