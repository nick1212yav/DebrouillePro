/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE SECURITY — TOKEN ROTATION ENGINE (WORLD #1 FINAL)           */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/security/tokenRotation.ts                              */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Responsibilities:                                                        */
/*   - Secure refresh-token rotation                                          */
/*   - Detect token reuse (replay attack)                                     */
/*   - Support revocation and session invalidation                            */
/*   - Maintain deterministic token lineage                                   */
/*                                                                            */
/*  Guarantees:                                                              */
/*   - One-time refresh token usage                                           */
/*   - Replay attack detection                                                */
/*   - Fast revocation                                                        */
/*   - Audit-ready                                                            */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import crypto from "crypto";
import { logger } from "../shared/logger";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export interface TokenSession {
  sessionId: string;
  userId: string;
  currentTokenHash: string;
  revoked: boolean;
  rotatedAt: number;
}

export interface RotationResult {
  sessionId: string;
  newRefreshToken: string;
}

/* -------------------------------------------------------------------------- */
/* INTERNAL STORE (SIMULATION)                                                */
/* -------------------------------------------------------------------------- */

/**
 * In production this must be stored in:
 *  - Redis
 *  - Database
 *  - Distributed cache
 */
const sessions = new Map<string, TokenSession>();

/* -------------------------------------------------------------------------- */
/* CRYPTO HELPERS                                                             */
/* -------------------------------------------------------------------------- */

const hashToken = (token: string): string =>
  crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

const generateToken = (): string =>
  crypto.randomBytes(48).toString("base64url");

const generateSessionId = (): string =>
  crypto.randomUUID();

/* -------------------------------------------------------------------------- */
/* SESSION MANAGEMENT                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Create a new refresh token session.
 * Called at login / initial authentication.
 */
export const createTokenSession = (
  userId: string
): RotationResult => {
  const refreshToken = generateToken();
  const sessionId = generateSessionId();

  const session: TokenSession = {
    sessionId,
    userId,
    currentTokenHash: hashToken(refreshToken),
    revoked: false,
    rotatedAt: Date.now(),
  };

  sessions.set(sessionId, session);

  logger.info("🔐 Token session created", {
    sessionId,
    userId,
  });

  return {
    sessionId,
    newRefreshToken: refreshToken,
  };
};

/* -------------------------------------------------------------------------- */
/* TOKEN ROTATION                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Rotate a refresh token securely.
 * Detects token reuse and invalidates compromised sessions.
 */
export const rotateRefreshToken = (
  sessionId: string,
  providedToken: string
): RotationResult => {
  const session = sessions.get(sessionId);

  if (!session) {
    logger.warn("❌ Unknown token session", {
      sessionId,
    });
    throw new Error("Invalid session");
  }

  if (session.revoked) {
    logger.warn("🚫 Revoked session used", {
      sessionId,
      userId: session.userId,
    });
    throw new Error("Session revoked");
  }

  const providedHash = hashToken(
    providedToken
  );

  /* ---------------------------------------------------------------------- */
  /* REPLAY DETECTION                                                        */
  /* ---------------------------------------------------------------------- */

  if (providedHash !== session.currentTokenHash) {
    logger.error(
      "🔥 Token reuse detected — session compromised",
      {
        sessionId,
        userId: session.userId,
      }
    );

    // Kill session immediately
    session.revoked = true;
    sessions.set(sessionId, session);

    throw new Error("Token reuse detected");
  }

  /* ---------------------------------------------------------------------- */
  /* ROTATION                                                                 */
  /* ---------------------------------------------------------------------- */

  const newRefreshToken = generateToken();

  session.currentTokenHash =
    hashToken(newRefreshToken);
  session.rotatedAt = Date.now();

  sessions.set(sessionId, session);

  logger.info("🔁 Refresh token rotated", {
    sessionId,
    userId: session.userId,
  });

  return {
    sessionId,
    newRefreshToken,
  };
};

/* -------------------------------------------------------------------------- */
/* REVOCATION                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Revoke a session manually (logout, admin action, security event).
 */
export const revokeSession = (
  sessionId: string
): void => {
  const session = sessions.get(sessionId);
  if (!session) return;

  session.revoked = true;
  sessions.set(sessionId, session);

  logger.warn("🛑 Token session revoked", {
    sessionId,
    userId: session.userId,
  });
};

/* -------------------------------------------------------------------------- */
/* INTROSPECTION (SAFE)                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Safe introspection for observability and debugging.
 */
export const listTokenSessions = (): Array<
  Omit<TokenSession, "currentTokenHash">
> => {
  return Array.from(sessions.values()).map(
    ({ currentTokenHash, ...safe }) =>
      safe
  );
};
