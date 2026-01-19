/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE FEATURES — FEATURE SERVICE (WORLD #1 FINAL)                  */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/features/feature.service.ts                            */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Responsibilities:                                                        */
/*   - Evaluate feature flags deterministically                               */
/*   - Apply rollout strategies                                               */
/*   - Enforce constraints                                                    */
/*   - Provide explainable decisions                                          */
/*                                                                            */
/*  Guarantees:                                                              */
/*   - Pure evaluation logic                                                  */
/*   - No side effects                                                        */
/*   - Stable behavior                                                        */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import crypto from "crypto";

import {
  FeatureContext,
  FeatureDefinition,
  FeatureEvaluation,
} from "./feature.types";
import { logger } from "../shared/logger";
import { ENV } from "../config";

/* -------------------------------------------------------------------------- */
/* INTERNAL STORE                                                             */
/* -------------------------------------------------------------------------- */

/**
 * In-memory feature registry.
 * In production this can be backed by DB / Redis.
 */
const featureRegistry = new Map<
  string,
  FeatureDefinition
>();

/* -------------------------------------------------------------------------- */
/* HASHING UTIL                                                               */
/* -------------------------------------------------------------------------- */

const stableHash = (input: string): number => {
  const hash = crypto
    .createHash("sha1")
    .update(input)
    .digest("hex");

  return parseInt(hash.slice(0, 8), 16) % 100;
};

/* -------------------------------------------------------------------------- */
/* FEATURE REGISTRATION                                                       */
/* -------------------------------------------------------------------------- */

export const registerFeature = (
  feature: FeatureDefinition
): void => {
  if (featureRegistry.has(feature.key)) {
    throw new Error(
      `Feature already registered: ${feature.key}`
    );
  }

  featureRegistry.set(feature.key, feature);

  logger.info("🎛️ Feature registered", {
    key: feature.key,
    status: feature.status,
  });
};

/* -------------------------------------------------------------------------- */
/* CONSTRAINT CHECKING                                                        */
/* -------------------------------------------------------------------------- */

const matchConstraints = (
  feature: FeatureDefinition,
  context: FeatureContext
): boolean => {
  const { constraints } = feature;
  if (!constraints) return true;

  if (
    constraints.environments &&
    !constraints.environments.includes(
      context.environment ?? ENV.NODE_ENV
    )
  ) {
    return false;
  }

  if (
    constraints.countries &&
    !constraints.countries.includes(
      context.country ?? "UNKNOWN"
    )
  ) {
    return false;
  }

  return true;
};

/* -------------------------------------------------------------------------- */
/* ROLLOUT EVALUATION                                                         */
/* -------------------------------------------------------------------------- */

const evaluateRollout = (
  feature: FeatureDefinition,
  context: FeatureContext
): { enabled: boolean; reason: string } => {
  const { rollout } = feature;

  switch (rollout.strategy) {
    case "global":
      return {
        enabled: true,
        reason: "Global rollout",
      };

    case "percentage": {
      const seed =
        context.userId ??
        context.organizationId ??
        "anonymous";

      const bucket = stableHash(
        `${feature.key}:${seed}`
      );

      const percentage =
        rollout.percentage ?? 0;

      return {
        enabled: bucket < percentage,
        reason: `Percentage rollout (${bucket} < ${percentage})`,
      };
    }

    case "allowlist": {
      const id =
        context.userId ??
        context.organizationId;

      const allowed =
        !!id &&
        rollout.list?.includes(id);

      return {
        enabled: allowed,
        reason: allowed
          ? "Allowlisted"
          : "Not in allowlist",
      };
    }

    case "denylist": {
      const id =
        context.userId ??
        context.organizationId;

      const denied =
        !!id &&
        rollout.list?.includes(id);

      return {
        enabled: !denied,
        reason: denied
          ? "Denied by denylist"
          : "Not denied",
      };
    }

    default:
      return {
        enabled: false,
        reason: "Unknown rollout strategy",
      };
  }
};

/* -------------------------------------------------------------------------- */
/* PUBLIC API — FEATURE EVALUATION                                            */
/* -------------------------------------------------------------------------- */

export const evaluateFeature = (
  featureKey: string,
  context: FeatureContext = {}
): FeatureEvaluation => {
  const feature = featureRegistry.get(featureKey);

  if (!feature) {
    logger.warn("🚫 Feature not found", {
      featureKey,
    });

    throw new Error(`Unknown feature: ${featureKey}`);
  }

  /* ---------------------------------------------------------------------- */
  /* STATUS CHECK                                                            */
  /* ---------------------------------------------------------------------- */

  if (feature.status === "disabled") {
    return {
      enabled: false,
      reason: "Feature disabled",
      feature,
    };
  }

  if (feature.status === "deprecated") {
    logger.warn("⚠️ Deprecated feature accessed", {
      featureKey,
    });
  }

  /* ---------------------------------------------------------------------- */
  /* CONSTRAINT CHECK                                                        */
  /* ---------------------------------------------------------------------- */

  if (!matchConstraints(feature, context)) {
    return {
      enabled: false,
      reason: "Context constraints not satisfied",
      feature,
    };
  }

  /* ---------------------------------------------------------------------- */
  /* ROLLOUT CHECK                                                           */
  /* ---------------------------------------------------------------------- */

  const rolloutResult = evaluateRollout(
    feature,
    context
  );

  return {
    enabled: rolloutResult.enabled,
    reason: rolloutResult.reason,
    feature,
  };
};

/* -------------------------------------------------------------------------- */
/* PUBLIC API — INTROSPECTION                                                 */
/* -------------------------------------------------------------------------- */

export const listFeatures = (): FeatureDefinition[] =>
  Array.from(featureRegistry.values());
