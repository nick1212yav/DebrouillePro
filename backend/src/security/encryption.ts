/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE SECURITY — ENCRYPTION ENGINE (WORLD #1 FINAL)               */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/security/encryption.ts                                 */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Responsibilities:                                                        */
/*   - Strong symmetric encryption (AES-256-GCM)                              */
/*   - Authenticated encryption                                               */
/*   - Tamper detection                                                       */
/*   - Versioned crypto payloads                                              */
/*                                                                            */
/*  Guarantees:                                                              */
/*   - Confidentiality                                                        */
/*   - Integrity                                                              */
/*   - Forward compatibility                                                  */
/*   - Zero silent corruption                                                 */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import crypto from "crypto";
import { ENV } from "../config";
import { logger } from "../shared/logger";

/* -------------------------------------------------------------------------- */
/* CRYPTO CONSTANTS                                                           */
/* -------------------------------------------------------------------------- */

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // recommended for GCM
const AUTH_TAG_LENGTH = 16;
const PAYLOAD_VERSION = "v1";

/* -------------------------------------------------------------------------- */
/* KEY DERIVATION                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Derive a strong 256-bit key from the master secret.
 * Uses SHA-256 for deterministic derivation.
 */
const deriveKey = (): Buffer => {
  const secret = ENV.JWT_ACCESS_SECRET;

  const hash = crypto
    .createHash("sha256")
    .update(secret)
    .digest();

  if (hash.length !== KEY_LENGTH) {
    throw new Error("Invalid derived key length");
  }

  return hash;
};

const ENCRYPTION_KEY = deriveKey();

/* -------------------------------------------------------------------------- */
/* PAYLOAD FORMAT                                                             */
/* -------------------------------------------------------------------------- */
/**
 * Payload format (base64url encoded):
 *
 *   v1.<iv>.<ciphertext>.<authTag>
 *
 * This allows:
 *  - Versioning
 *  - Future algorithm migration
 *  - Safe parsing
 */

/* -------------------------------------------------------------------------- */
/* ENCODING UTILITIES                                                         */
/* -------------------------------------------------------------------------- */

const encode = (buffer: Buffer): string =>
  buffer.toString("base64url");

const decode = (value: string): Buffer =>
  Buffer.from(value, "base64url");

/* -------------------------------------------------------------------------- */
/* ENCRYPT                                                                    */
/* -------------------------------------------------------------------------- */

export const encrypt = (plaintext: string): string => {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(
      ALGORITHM,
      ENCRYPTION_KEY,
      iv
    );

    const encrypted = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    const payload = [
      PAYLOAD_VERSION,
      encode(iv),
      encode(encrypted),
      encode(authTag),
    ].join(".");

    return payload;
  } catch (error) {
    logger.error("❌ Encryption failed", {
      error,
    });
    throw new Error("Encryption failure");
  }
};

/* -------------------------------------------------------------------------- */
/* DECRYPT                                                                    */
/* -------------------------------------------------------------------------- */

export const decrypt = (payload: string): string => {
  try {
    const parts = payload.split(".");
    if (parts.length !== 4) {
      throw new Error("Invalid encrypted payload format");
    }

    const [version, ivRaw, dataRaw, tagRaw] =
      parts;

    if (version !== PAYLOAD_VERSION) {
      throw new Error(
        `Unsupported crypto version: ${version}`
      );
    }

    const iv = decode(ivRaw);
    const encrypted = decode(dataRaw);
    const authTag = decode(tagRaw);

    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error("Invalid auth tag length");
    }

    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      ENCRYPTION_KEY,
      iv
    );

    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch (error) {
    logger.error("❌ Decryption failed", {
      error,
    });
    throw new Error("Decryption failure");
  }
};
