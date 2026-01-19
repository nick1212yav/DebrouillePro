/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE SECURITY — SECRETS ENGINE (WORLD #1 FINAL)                  */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/security/secrets.ts                                    */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Responsibilities:                                                        */
/*   - Centralize access to sensitive secrets                                 */
/*   - Validate presence and format                                           */
/*   - Mask secrets in logs                                                   */
/*   - Prepare future Vault / KMS integration                                 */
/*                                                                            */
/*  Guarantees:                                                              */
/*   - No secret leakage in logs                                               */
/*   - Fail-fast if critical secret missing                                   */
/*   - Deterministic access                                                   */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { logger } from "../shared/logger";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type SecretKey =
  | "JWT_ACCESS_SECRET"
  | "JWT_REFRESH_SECRET"
  | "MONGO_URI"
  | "INTERNAL_ENCRYPTION_KEY"
  | "WEBHOOK_SIGNING_SECRET";

/* -------------------------------------------------------------------------- */
/* INTERNAL STORE                                                             */
/* -------------------------------------------------------------------------- */

/**
 * In production this can be backed by:
 *  - Hashicorp Vault
 *  - AWS Secrets Manager
 *  - GCP Secret Manager
 */
const secretStore = new Map<SecretKey, string>();

/* -------------------------------------------------------------------------- */
/* MASKING                                                                    */
/* -------------------------------------------------------------------------- */

const maskSecret = (value: string): string => {
  if (value.length <= 6) return "***";
  return (
    value.slice(0, 2) +
    "***" +
    value.slice(-2)
  );
};

/* -------------------------------------------------------------------------- */
/* VALIDATION                                                                 */
/* -------------------------------------------------------------------------- */

const assertValidSecret = (
  key: SecretKey,
  value: string
) => {
  if (!value || value.length < 8) {
    logger.error("❌ Invalid secret detected", {
      key,
    });
    throw new Error(`Invalid secret: ${key}`);
  }
};

/* -------------------------------------------------------------------------- */
/* BOOTSTRAP LOADER                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Load secrets from environment variables at startup.
 * Fail-fast if critical secrets are missing.
 */
export const loadSecrets = (): void => {
  const requiredSecrets: SecretKey[] = [
    "JWT_ACCESS_SECRET",
    "JWT_REFRESH_SECRET",
    "MONGO_URI",
  ];

  const optionalSecrets: SecretKey[] = [
    "INTERNAL_ENCRYPTION_KEY",
    "WEBHOOK_SIGNING_SECRET",
  ];

  for (const key of requiredSecrets) {
    const value = process.env[key];
    if (!value) {
      throw new Error(
        `Missing required secret: ${key}`
      );
    }

    assertValidSecret(key, value);
    secretStore.set(key, value);

    logger.info("🔐 Secret loaded", {
      key,
      value: maskSecret(value),
    });
  }

  for (const key of optionalSecrets) {
    const value = process.env[key];
    if (!value) continue;

    assertValidSecret(key, value);
    secretStore.set(key, value);

    logger.info("🔐 Optional secret loaded", {
      key,
      value: maskSecret(value),
    });
  }

  logger.info("✅ Secrets engine initialized", {
    total: secretStore.size,
  });
};

/* -------------------------------------------------------------------------- */
/* SECRET ACCESS                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Retrieve a secret safely.
 */
export const getSecret = (
  key: SecretKey
): string => {
  const value = secretStore.get(key);

  if (!value) {
    logger.error("❌ Secret not found", {
      key,
    });
    throw new Error(`Secret not found: ${key}`);
  }

  return value;
};

/* -------------------------------------------------------------------------- */
/* SECRET ROTATION                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Rotate a secret dynamically.
 * Useful for live rotation scenarios.
 */
export const rotateSecret = (
  key: SecretKey,
  newValue: string
): void => {
  assertValidSecret(key, newValue);
  secretStore.set(key, newValue);

  logger.warn("🔁 Secret rotated", {
    key,
    value: maskSecret(newValue),
  });
};

/* -------------------------------------------------------------------------- */
/* INTROSPECTION (SAFE)                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Return safe metadata for observability.
 */
export const listSecrets = (): Array<{
  key: SecretKey;
  masked: string;
}> => {
  return Array.from(secretStore.entries()).map(
    ([key, value]) => ({
      key,
      masked: maskSecret(value),
    })
  );
};
