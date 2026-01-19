/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE SECURITY — HASHING ENGINE (WORLD #1 FINAL)                  */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/security/hashing.ts                                    */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Responsibilities:                                                        */
/*   - Secure password hashing                                                */
/*   - Salt generation                                                        */
/*   - Timing-safe verification                                               */
/*   - Hash upgrade readiness                                                 */
/*                                                                            */
/*  Guarantees:                                                              */
/*   - One-way irreversible hashing                                           */
/*   - Unique salt per hash                                                   */
/*   - Strong entropy                                                        */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import crypto from "crypto";
import { logger } from "../shared/logger";

/* -------------------------------------------------------------------------- */
/* HASH CONFIG                                                                */
/* -------------------------------------------------------------------------- */

const HASH_ALGORITHM = "sha512";
const ITERATIONS = 120_000;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const FORMAT_VERSION = "v1";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export interface HashPayload {
  version: string;
  iterations: number;
  salt: string;
  hash: string;
}

/* -------------------------------------------------------------------------- */
/* SALT GENERATION                                                            */
/* -------------------------------------------------------------------------- */

const generateSalt = (): Buffer =>
  crypto.randomBytes(SALT_LENGTH);

/* -------------------------------------------------------------------------- */
/* HASH DERIVATION                                                            */
/* -------------------------------------------------------------------------- */

const deriveHash = (
  password: string,
  salt: Buffer,
  iterations: number
): Buffer =>
  crypto.pbkdf2Sync(
    password,
    salt,
    iterations,
    KEY_LENGTH,
    HASH_ALGORITHM
  );

/* -------------------------------------------------------------------------- */
/* SERIALIZATION                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Format:
 *   v1.iterations.salt.hash   (base64url)
 */
const serialize = (
  payload: HashPayload
): string =>
  [
    payload.version,
    payload.iterations,
    payload.salt,
    payload.hash,
  ].join(".");

/**
 * Parse serialized hash payload.
 */
const deserialize = (raw: string): HashPayload => {
  const parts = raw.split(".");
  if (parts.length !== 4) {
    throw new Error("Invalid hash payload format");
  }

  const [version, iterationsRaw, salt, hash] =
    parts;

  return {
    version,
    iterations: Number(iterationsRaw),
    salt,
    hash,
  };
};

/* -------------------------------------------------------------------------- */
/* PUBLIC API                                                                 */
/* -------------------------------------------------------------------------- */

export const hashPassword = (
  password: string
): string => {
  try {
    const salt = generateSalt();
    const hash = deriveHash(
      password,
      salt,
      ITERATIONS
    );

    return serialize({
      version: FORMAT_VERSION,
      iterations: ITERATIONS,
      salt: salt.toString("base64url"),
      hash: hash.toString("base64url"),
    });
  } catch (error) {
    logger.error("❌ Hashing failed", {
      error,
    });
    throw new Error("Hashing failure");
  }
};

export const verifyPassword = (
  password: string,
  storedHash: string
): boolean => {
  try {
    const payload = deserialize(storedHash);

    if (payload.version !== FORMAT_VERSION) {
      logger.warn(
        "⚠️ Hash version mismatch detected",
        payload
      );
    }

    const salt = Buffer.from(
      payload.salt,
      "base64url"
    );

    const expected = Buffer.from(
      payload.hash,
      "base64url"
    );

    const actual = deriveHash(
      password,
      salt,
      payload.iterations
    );

    return crypto.timingSafeEqual(
      expected,
      actual
    );
  } catch (error) {
    logger.error("❌ Password verification failed", {
      error,
    });
    return false;
  }
};
