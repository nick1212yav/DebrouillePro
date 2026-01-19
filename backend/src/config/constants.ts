/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE CONFIG — CONSTANTS (WORLD #1 CANONICAL FINAL)                  */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/config/constants.ts                                     */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Strategic role:                                                          */
/*   - Define all global invariants of the system                             */
/*   - Centralize limits, standards and governance rules                      */
/*   - Eliminate magic values across the codebase                             */
/*                                                                            */
/*  Guarantees:                                                              */
/*   - Immutable contracts (as const)                                         */
/*   - Strong typing                                                         */
/*   - Cross-module consistency                                               */
/*   - Future-proof                                                          */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* API                                                                        */
/* -------------------------------------------------------------------------- */

export const API = {
  PREFIX: "/api",
  DEFAULT_VERSION: "v1",

  /**
   * All API versions supported by the platform.
   * Used for routing, version negotiation and deprecation.
   */
  SUPPORTED_VERSIONS: ["v1"],
} as const;

/* -------------------------------------------------------------------------- */
/* PAGINATION                                                                 */
/* -------------------------------------------------------------------------- */

export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

/* -------------------------------------------------------------------------- */
/* SECURITY                                                                   */
/* -------------------------------------------------------------------------- */

export const SECURITY = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,

  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 30,

  BIO_MAX_LENGTH: 500,
  DESCRIPTION_MAX_LENGTH: 2_000,

  MAX_LOGIN_ATTEMPTS: 5,
  LOCK_TIME_MINUTES: 15,
} as const;

/* -------------------------------------------------------------------------- */
/* FILES & STORAGE                                                            */
/* -------------------------------------------------------------------------- */

export const FILES = {
  MAX_UPLOAD_SIZE_MB: 25,

  ALLOWED_MIME_TYPES: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
    "video/mp4",
  ],

  HASH_ALGORITHM: "sha256",
} as const;

/* -------------------------------------------------------------------------- */
/* PAY / FINANCE                                                              */
/* -------------------------------------------------------------------------- */

export const PAY = {
  MIN_TRANSACTION_AMOUNT: 0.01,
  MAX_TRANSACTION_AMOUNT: 10_000_000,

  DEFAULT_CURRENCY: "USD",

  WALLET_INITIAL_BALANCE: 0,

  TRANSACTION_REFERENCE_PREFIX: "DBP",
} as const;

/* -------------------------------------------------------------------------- */
/* TRUST & GOVERNANCE                                                         */
/* -------------------------------------------------------------------------- */

export const TRUST = {
  INITIAL_SCORE: 50,
  MAX_SCORE: 100,
  MIN_SCORE: 0,

  SCORE_INCREMENT: 1,
  SCORE_DECREMENT: 2,

  VERIFICATION_BONUS: 10,
} as const;

/* -------------------------------------------------------------------------- */
/* DOCUMENTS                                                                  */
/* -------------------------------------------------------------------------- */

export const DOCUMENTS = {
  TITLE_MAX_LENGTH: 150,
  DESCRIPTION_MAX_LENGTH: 1_000,

  DEFAULT_VISIBILITY: "PRIVATE",

  MAX_DOCUMENTS_PER_IDENTITY: 10_000,
} as const;

/* -------------------------------------------------------------------------- */
/* AI                                                                         */
/* -------------------------------------------------------------------------- */

export const AI = {
  DEFAULT_CONFIDENCE_THRESHOLD: "MEDIUM",

  MAX_PREFERENCES: 200,
  MAX_INFERENCES: 500,
  MAX_RECOMMENDATIONS: 100,

  INFERENCE_TTL_DAYS: 30,
} as const;

/* -------------------------------------------------------------------------- */
/* TRACKING / AUDIT                                                           */
/* -------------------------------------------------------------------------- */

export const TRACKING = {
  MAX_LOGS_PER_REQUEST: 20,
  RETENTION_DAYS: 365 * 5, // 5 years
} as const;

/* -------------------------------------------------------------------------- */
/* TIME                                                                       */
/* -------------------------------------------------------------------------- */

export const TIME = {
  ONE_SECOND_MS: 1_000,
  ONE_MINUTE_MS: 60_000,
  ONE_HOUR_MS: 3_600_000,
  ONE_DAY_MS: 86_400_000,
} as const;

/* -------------------------------------------------------------------------- */
/* SYSTEM                                                                     */
/* -------------------------------------------------------------------------- */

export const SYSTEM = {
  PLATFORM_NAME: "DebrouillePro",
  PLATFORM_OWNER: "Debrouille",
  SUPPORT_EMAIL: "support@debrouille.com",

  DEFAULT_LOCALE: "fr",
} as const;
