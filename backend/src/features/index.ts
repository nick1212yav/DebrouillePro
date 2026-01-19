/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE FEATURES — PUBLIC EXPORT HUB (WORLD #1 FINAL)                */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/features/index.ts                                      */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Strategic role:                                                          */
/*   - Single public entrypoint for feature flag system                       */
/*   - Enforce architectural boundaries                                       */
/*   - Centralize feature registration                                        */
/*   - Stabilize contracts                                                     */
/*                                                                            */
/*  Guarantees:                                                              */
/*   - Deterministic initialization                                            */
/*   - Explicit exports only                                                  */
/*   - No circular dependencies                                               */
/*   - Type-safe                                                             */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* PUBLIC TYPES                                                               */
/* -------------------------------------------------------------------------- */

export type {
  FeatureDefinition,
  FeatureContext,
  FeatureEvaluation,
  FeatureStatus,
  RolloutStrategy,
} from "./feature.types";

/* -------------------------------------------------------------------------- */
/* PUBLIC SERVICES                                                            */
/* -------------------------------------------------------------------------- */

export {
  registerFeature,
  evaluateFeature,
  listFeatures,
} from "./feature.service";

/* -------------------------------------------------------------------------- */
/* AUTO-REGISTER CORE FEATURES                                                */
/* -------------------------------------------------------------------------- */

/**
 * ⚠️ IMPORTANT:
 * Core features are registered here.
 * This guarantees deterministic behavior across environments.
 *
 * Additional module-specific features should be registered
 * inside their respective module initializers.
 */

import { registerFeature } from "./feature.service";

/* -------------------------------------------------------------------------- */
/* CORE FEATURE FLAGS                                                         */
/* -------------------------------------------------------------------------- */

registerFeature({
  key: "RATE_LIMIT_ENABLED",
  description:
    "Enable global API rate limiting protection",
  status: "enabled",
  version: 1,
  rollout: {
    strategy: "global",
  },
  owner: "platform",
  createdAt: Date.now(),
});

registerFeature({
  key: "EXPERIMENTAL_FEATURES_ENABLED",
  description:
    "Allow access to experimental and preview features",
  status: "disabled",
  version: 1,
  rollout: {
    strategy: "global",
  },
  owner: "platform",
  createdAt: Date.now(),
});

registerFeature({
  key: "AI_PIPELINE_ENABLED",
  description:
    "Enable asynchronous AI inference pipeline",
  status: "beta",
  version: 1,
  rollout: {
    strategy: "percentage",
    percentage: 10,
  },
  owner: "ai-team",
  createdAt: Date.now(),
});

/* -------------------------------------------------------------------------- */
/* GOVERNANCE                                                                 */
/* -------------------------------------------------------------------------- */
/*
  Usage rules:

  ✅ Always import features from:
        import { evaluateFeature } from "@/features";

  ❌ Never deep import:
        "@/features/feature.service"
        "@/features/feature.types"

  This guarantees:
   - Stable public contracts
   - Safe refactors
   - Deterministic feature registration
   - Predictable rollout behavior
*/
