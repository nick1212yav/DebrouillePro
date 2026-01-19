/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE CONFIG — FEATURES FLAGS (WORLD #1 FINAL)                       */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/config/features.ts                                      */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Strategic role:                                                          */
/*   - Centralize all feature toggles of the platform                         */
/*   - Enable safe rollouts and emergency shutdowns                           */
/*   - Allow progressive activation without redeploy                          */
/*   - Enforce deterministic behavior per environment                         */
/*                                                                            */
/*  Guarantees:                                                              */
/*   - Strong typing                                                         */
/*   - Immutable configuration                                                */
/*   - Environment-aware defaults                                             */
/*   - Safe fallbacks                                                         */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { ENV } from "./env";

/* -------------------------------------------------------------------------- */
/* FEATURE FLAG TYPES                                                         */
/* -------------------------------------------------------------------------- */

export type FeatureKey =
  | "PAYMENTS_ENABLED"
  | "ESCROW_ENABLED"
  | "PAYOUTS_ENABLED"
  | "AI_ENGINE_ENABLED"
  | "TRUST_ENGINE_ENABLED"
  | "AUDIT_ENABLED"
  | "EVENT_BUS_ENABLED"
  | "BACKGROUND_JOBS_ENABLED"
  | "WEBHOOKS_ENABLED"
  | "RATE_LIMIT_ENABLED"
  | "CACHE_ENABLED"
  | "BETA_FEATURES_ENABLED"
  | "EXPERIMENTAL_FEATURES_ENABLED";

/* -------------------------------------------------------------------------- */
/* FEATURE FLAG DEFINITION                                                    */
/* -------------------------------------------------------------------------- */

export interface FeatureDefinition {
  key: FeatureKey;
  description: string;
  defaultEnabled: boolean;
  environments?: Partial<Record<typeof ENV.NODE_ENV, boolean>>;
  killSwitch?: boolean;
}

/* -------------------------------------------------------------------------- */
/* FEATURE CATALOG (SINGLE SOURCE OF TRUTH)                                   */
/* -------------------------------------------------------------------------- */

const FEATURE_DEFINITIONS: readonly FeatureDefinition[] = [
  {
    key: "PAYMENTS_ENABLED",
    description: "Enable wallet, transactions and payment providers",
    defaultEnabled: true,
  },
  {
    key: "ESCROW_ENABLED",
    description: "Enable escrow flows and locked funds",
    defaultEnabled: true,
  },
  {
    key: "PAYOUTS_ENABLED",
    description: "Enable payout flows to external providers",
    defaultEnabled: true,
  },
  {
    key: "AI_ENGINE_ENABLED",
    description: "Enable AI inference and recommendations engine",
    defaultEnabled: true,
  },
  {
    key: "TRUST_ENGINE_ENABLED",
    description: "Enable trust scoring and governance engine",
    defaultEnabled: true,
  },
  {
    key: "AUDIT_ENABLED",
    description: "Enable audit logging and traceability",
    defaultEnabled: true,
  },
  {
    key: "EVENT_BUS_ENABLED",
    description: "Enable internal event bus",
    defaultEnabled: true,
  },
  {
    key: "BACKGROUND_JOBS_ENABLED",
    description: "Enable async workers and background processing",
    defaultEnabled: true,
  },
  {
    key: "WEBHOOKS_ENABLED",
    description: "Enable incoming and outgoing webhooks",
    defaultEnabled: true,
  },
  {
    key: "RATE_LIMIT_ENABLED",
    description: "Enable API rate limiting protection",
    defaultEnabled: true,
  },
  {
    key: "CACHE_ENABLED",
    description: "Enable caching layer (redis/memory)",
    defaultEnabled: true,
  },
  {
    key: "BETA_FEATURES_ENABLED",
    description: "Enable beta features for internal testing",
    defaultEnabled: ENV.IS_DEVELOPMENT || ENV.IS_STAGING,
  },
  {
    key: "EXPERIMENTAL_FEATURES_ENABLED",
    description: "Enable experimental features (dangerous)",
    defaultEnabled: false,
    environments: {
      development: true,
      staging: false,
      production: false,
    },
  },
] as const;

/* -------------------------------------------------------------------------- */
/* INTERNAL HELPERS                                                           */
/* -------------------------------------------------------------------------- */

const parseBoolean = (value?: string): boolean | undefined => {
  if (value === undefined) return undefined;
  return ["true", "1", "yes", "on"].includes(value.toLowerCase());
};

const getEnvOverride = (key: FeatureKey): boolean | undefined => {
  const raw = process.env[`FEATURE_${key}`];
  return parseBoolean(raw);
};

/* -------------------------------------------------------------------------- */
/* FEATURE RESOLUTION ENGINE                                                  */
/* -------------------------------------------------------------------------- */

const resolveFeatureValue = (
  definition: FeatureDefinition
): boolean => {
  /**
   * 1. Kill switch always wins
   */
  if (definition.killSwitch === true) {
    return false;
  }

  /**
   * 2. Explicit environment override
   */
  const envOverride =
    definition.environments?.[ENV.NODE_ENV];
  if (envOverride !== undefined) {
    return envOverride;
  }

  /**
   * 3. Environment variable override
   *    Example:
   *      FEATURE_PAYMENTS_ENABLED=false
   */
  const envVarOverride = getEnvOverride(
    definition.key
  );
  if (envVarOverride !== undefined) {
    return envVarOverride;
  }

  /**
   * 4. Default fallback
   */
  return definition.defaultEnabled;
};

/* -------------------------------------------------------------------------- */
/* FINAL FEATURE MAP (IMMUTABLE)                                              */
/* -------------------------------------------------------------------------- */

type FeatureMap = Record<FeatureKey, boolean>;

const featureEntries = FEATURE_DEFINITIONS.map(
  (definition) => [
    definition.key,
    resolveFeatureValue(definition),
  ] as const
);

export const FEATURES: Readonly<FeatureMap> =
  Object.freeze(
    Object.fromEntries(featureEntries) as FeatureMap
  );

/* -------------------------------------------------------------------------- */
/* FEATURE ACCESSOR                                                           */
/* -------------------------------------------------------------------------- */

export const isFeatureEnabled = (
  feature: FeatureKey
): boolean => {
  return FEATURES[feature] === true;
};

/* -------------------------------------------------------------------------- */
/* VISIBILITY                                                                 */
/* -------------------------------------------------------------------------- */

// eslint-disable-next-line no-console
console.table(
  Object.entries(FEATURES).map(([key, value]) => ({
    feature: key,
    enabled: value,
  }))
);
