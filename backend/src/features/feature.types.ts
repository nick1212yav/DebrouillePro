/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE FEATURES — FEATURE TYPES (WORLD #1 FINAL)                     */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/features/feature.types.ts                               */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Strategic role:                                                          */
/*   - Define the universal contract for feature flags                        */
/*   - Guarantee deterministic activation                                    */
/*   - Enable experimentation and safe rollout                                */
/*   - Provide strong typing across the system                                */
/*                                                                            */
/*  Guarantees:                                                              */
/*   - Immutable flag definitions                                             */
/*   - Versioned features                                                     */
/*   - Auditable activation                                                   */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* FEATURE STATUS                                                             */
/* -------------------------------------------------------------------------- */

export type FeatureStatus =
  | "disabled"
  | "enabled"
  | "beta"
  | "deprecated";

/* -------------------------------------------------------------------------- */
/* ROLLOUT STRATEGY                                                           */
/* -------------------------------------------------------------------------- */

export type RolloutStrategy =
  | "global"
  | "percentage"
  | "allowlist"
  | "denylist";

/* -------------------------------------------------------------------------- */
/* FEATURE TARGETING                                                          */
/* -------------------------------------------------------------------------- */

export interface FeatureTarget {
  userId?: string;
  organizationId?: string;
  country?: string;
  environment?: string;
}

/* -------------------------------------------------------------------------- */
/* FEATURE DEFINITION                                                         */
/* -------------------------------------------------------------------------- */

export interface FeatureDefinition {
  key: string;
  description: string;
  status: FeatureStatus;
  version: number;

  /**
   * Rollout configuration.
   */
  rollout: {
    strategy: RolloutStrategy;

    /**
     * Used when strategy === "percentage"
     */
    percentage?: number;

    /**
     * Used when strategy === "allowlist" | "denylist"
     */
    list?: string[];
  };

  /**
   * Optional activation constraints.
   */
  constraints?: {
    environments?: string[];
    countries?: string[];
  };

  /**
   * Audit metadata.
   */
  owner: string;
  createdAt: number;
}

/* -------------------------------------------------------------------------- */
/* FEATURE CONTEXT                                                            */
/* -------------------------------------------------------------------------- */

export interface FeatureContext {
  userId?: string;
  organizationId?: string;
  country?: string;
  environment?: string;
}

/* -------------------------------------------------------------------------- */
/* FEATURE EVALUATION RESULT                                                  */
/* -------------------------------------------------------------------------- */

export interface FeatureEvaluation {
  enabled: boolean;
  reason: string;
  feature: FeatureDefinition;
}
