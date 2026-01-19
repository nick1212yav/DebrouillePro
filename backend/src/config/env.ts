/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE CONFIG — ENV (WORLD #1 CANONICAL FINAL)                        */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/config/env.ts                                           */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Strategic role:                                                          */
/*   - Load, validate and normalize the full environment                      */
/*   - Prevent any invalid startup                                            */
/*   - Act as the single source of truth for runtime config                   */
/*                                                                            */
/*  Guarantees:                                                              */
/*   - Fail-fast on misconfiguration                                          */
/*   - Strict typing                                                         */
/*   - Deterministic defaults                                                 */
/*   - Production safety                                                     */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import dotenv from "dotenv";

/* -------------------------------------------------------------------------- */
/* LOAD ENV FILE                                                              */
/* -------------------------------------------------------------------------- */

dotenv.config();

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type NodeEnv = "development" | "staging" | "production";

/* -------------------------------------------------------------------------- */
/* INTERNAL HELPERS (FAIL FAST)                                               */
/* -------------------------------------------------------------------------- */

const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value || value.trim().length === 0) {
    // eslint-disable-next-line no-console
    console.error(`❌ Missing required environment variable: ${key}`);
    process.exit(1);
  }
  return value.trim();
};

const optionalEnv = (
  key: string,
  defaultValue?: string
): string | undefined => {
  const value = process.env[key];
  if (value === undefined || value.trim().length === 0) {
    return defaultValue;
  }
  return value.trim();
};

const parseNumber = (key: string, defaultValue?: number): number => {
  const raw = process.env[key];

  if (!raw || raw.trim().length === 0) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    // eslint-disable-next-line no-console
    console.error(`❌ Missing required numeric env: ${key}`);
    process.exit(1);
  }

  const parsed = Number(raw);
  if (Number.isNaN(parsed)) {
    // eslint-disable-next-line no-console
    console.error(`❌ Invalid number for env ${key}: ${raw}`);
    process.exit(1);
  }

  return parsed;
};

const parseBoolean = (
  key: string,
  defaultValue = false
): boolean => {
  const raw = process.env[key];
  if (!raw) return defaultValue;

  return ["true", "1", "yes", "on"].includes(raw.toLowerCase());
};

const parseList = (
  key: string,
  defaultValue: string[] = []
): string[] => {
  const raw = process.env[key];
  if (!raw || raw.trim().length === 0) {
    return defaultValue;
  }

  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
};

/* -------------------------------------------------------------------------- */
/* ENVIRONMENT GUARD                                                          */
/* -------------------------------------------------------------------------- */

const NODE_ENV: NodeEnv =
  (process.env.NODE_ENV as NodeEnv) ?? "development";

if (!["development", "staging", "production"].includes(NODE_ENV)) {
  // eslint-disable-next-line no-console
  console.error(`❌ Invalid NODE_ENV: ${process.env.NODE_ENV}`);
  process.exit(1);
}

/* -------------------------------------------------------------------------- */
/* EXPORT — SINGLE SOURCE OF TRUTH                                             */
/* -------------------------------------------------------------------------- */

export const ENV = {
  /* ====================================================================== */
  /* CORE                                                                    */
  /* ====================================================================== */

  NODE_ENV,
  IS_PRODUCTION: NODE_ENV === "production",
  IS_STAGING: NODE_ENV === "staging",
  IS_DEVELOPMENT: NODE_ENV === "development",

  APP_NAME: optionalEnv("APP_NAME", "Debrouille Backend")!,
  APP_VERSION: optionalEnv("APP_VERSION", "0.1.0")!,

  /* ====================================================================== */
  /* SERVER                                                                  */
  /* ====================================================================== */

  PORT: parseNumber("PORT", 4000),

  /**
   * Comma separated list:
   *   CORS_ORIGINS=http://localhost:3000,https://app.debrouille.com
   */
  CORS_ORIGINS: parseList("CORS_ORIGINS", ["*"]),

  /* ====================================================================== */
  /* DATABASE                                                                */
  /* ====================================================================== */

  MONGO_URI: requireEnv("MONGO_URI"),

  /* ====================================================================== */
  /* SECURITY — JWT (BANK-GRADE SPLIT)                                       */
  /* ====================================================================== */

  /**
   * ACCESS TOKEN
   * - short lived
   * - attached to each request
   */
  JWT_ACCESS_SECRET: requireEnv("JWT_ACCESS_SECRET"),
  JWT_ACCESS_EXPIRES_IN: optionalEnv(
    "JWT_ACCESS_EXPIRES_IN",
    "15m"
  )!,
  JWT_ACCESS_EXPIRES_IN_SEC: parseNumber(
    "JWT_ACCESS_EXPIRES_IN_SEC",
    15 * 60
  ),

  /**
   * REFRESH TOKEN
   * - long lived
   * - server-side rotation
   */
  JWT_REFRESH_SECRET: requireEnv("JWT_REFRESH_SECRET"),
  JWT_REFRESH_EXPIRES_IN: optionalEnv(
    "JWT_REFRESH_EXPIRES_IN",
    "30d"
  )!,
  JWT_REFRESH_EXPIRES_IN_MS: parseNumber(
    "JWT_REFRESH_EXPIRES_IN_MS",
    1000 * 60 * 60 * 24 * 30
  ),

  /* ====================================================================== */
  /* RATE LIMITING                                                          */
  /* ====================================================================== */

  RATE_LIMIT_WINDOW_MS: parseNumber("RATE_LIMIT_WINDOW_MS", 60_000),
  RATE_LIMIT_MAX: parseNumber("RATE_LIMIT_MAX", 300),

  /* ====================================================================== */
  /* PROVIDERS / EXTERNAL SERVICES                                           */
  /* ====================================================================== */

  STORAGE_PROVIDER: optionalEnv("STORAGE_PROVIDER", "local")!,
  AI_PROVIDER: optionalEnv("AI_PROVIDER", "internal")!,

  /* ====================================================================== */
  /* OBSERVABILITY                                                          */
  /* ====================================================================== */

  LOG_LEVEL: optionalEnv("LOG_LEVEL", "info")!,
  ENABLE_TRACING: parseBoolean("ENABLE_TRACING", true),
  ENABLE_METRICS: parseBoolean("ENABLE_METRICS", true),
} as const;

/* -------------------------------------------------------------------------- */
/* FINAL VISIBILITY (BOOT FEEDBACK)                                           */
/* -------------------------------------------------------------------------- */

// eslint-disable-next-line no-console
console.log(
  `⚙️ Environment loaded → ${ENV.NODE_ENV.toUpperCase()} | v${ENV.APP_VERSION}`
);
