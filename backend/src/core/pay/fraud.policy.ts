/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE PAY — FRAUD POLICY ENGINE (WORLD CLASS)                        */
/*  File: backend/src/core/pay/fraud.policy.ts                                */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*  - Définir les règles d’accès antifraude                                    */
/*  - Garantir séparation des pouvoirs                                        */
/*  - Encadrer l’IA                                                           */
/*  - Assurer traçabilité légale                                               */
/*                                                                            */
/*  PRINCIPES FONDAMENTAUX :                                                   */
/*  - Least privilege                                                         */
/*  - Explicabilité                                                           */
/*  - Auditabilité                                                            */
/*  - Défense en profondeur                                                   */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { IdentityKind } from "../identity/identity.types";

/* -------------------------------------------------------------------------- */
/* DOMAIN TYPES                                                               */
/* -------------------------------------------------------------------------- */

export type FraudCapability =
  | "FRAUD_ANALYZE"
  | "FRAUD_OBSERVE"
  | "FRAUD_RECOMMEND"
  | "FRAUD_SUPERVISE"
  | "FRAUD_OVERRIDE"
  | "FRAUD_EXPORT"
  | "FRAUD_SANDBOX";

export type FraudDecision =
  | "ALLOW"
  | "DENY"
  | "REVIEW"
  | "ESCALATE";

export interface FraudPolicyContext {
  identityKind: IdentityKind;
  identityId: string;

  roles?: string[];
  trustScore?: number;
  verificationLevel?: number;

  ipAddress?: string;
  countryCode?: string;

  isAI?: boolean;
  isSystem?: boolean;

  flags?: string[];
}

/* -------------------------------------------------------------------------- */
/* DECISION RESULT                                                            */
/* -------------------------------------------------------------------------- */

export interface FraudPolicyResult {
  decision: FraudDecision;
  reason: string;

  obligations?: {
    audit?: boolean;
    notifySupervisor?: boolean;
    requireMFA?: boolean;
    watermarkResult?: boolean;
  };

  metadata?: Record<string, unknown>;
}

/* -------------------------------------------------------------------------- */
/* INTERNAL RULE UTILITIES                                                    */
/* -------------------------------------------------------------------------- */

const hasRole = (
  ctx: FraudPolicyContext,
  role: string
) => ctx.roles?.includes(role);

const hasTrust = (
  ctx: FraudPolicyContext,
  min: number
) => (ctx.trustScore || 0) >= min;

const hasVerification = (
  ctx: FraudPolicyContext,
  min: number
) => (ctx.verificationLevel || 0) >= min;

const flagged = (
  ctx: FraudPolicyContext,
  flag: string
) => ctx.flags?.includes(flag);

/* -------------------------------------------------------------------------- */
/* CORE POLICY ENGINE                                                         */
/* -------------------------------------------------------------------------- */

export class FraudPolicyEngine {
  /* ======================================================================== */
  /* MAIN DECISION ENGINE                                                     */
  /* ======================================================================== */

  static evaluate(params: {
    capability: FraudCapability;
    context: FraudPolicyContext;
  }): FraudPolicyResult {
    const { capability, context } = params;

    /* -------------------------------------------------------------------- */
    /* HARD BLOCKS                                                          */
    /* -------------------------------------------------------------------- */

    if (flagged(context, "BANNED")) {
      return {
        decision: "DENY",
        reason: "Identity banned",
        obligations: { audit: true },
      };
    }

    if (flagged(context, "COMPROMISED")) {
      return {
        decision: "ESCALATE",
        reason: "Identity compromised",
        obligations: {
          audit: true,
          notifySupervisor: true,
          requireMFA: true,
        },
      };
    }

    /* -------------------------------------------------------------------- */
    /* SYSTEM / IA GUARDRAILS                                                */
    /* -------------------------------------------------------------------- */

    if (context.isAI) {
      if (
        capability === "FRAUD_OVERRIDE" ||
        capability === "FRAUD_EXPORT"
      ) {
        return {
          decision: "DENY",
          reason: "AI cannot perform irreversible actions",
          obligations: { audit: true },
        };
      }
    }

    if (context.isSystem) {
      return {
        decision: "ALLOW",
        reason: "System trusted execution",
        obligations: { audit: true },
      };
    }

    /* -------------------------------------------------------------------- */
    /* CAPABILITY RULES                                                     */
    /* -------------------------------------------------------------------- */

    switch (capability) {
      case "FRAUD_ANALYZE":
        return this.allowIf({
          condition:
            hasTrust(context, 10) ||
            hasRole(context, "ANALYST"),
          success: "Analysis allowed",
          failure: "Insufficient trust or role",
        });

      case "FRAUD_OBSERVE":
        return this.allowIf({
          condition:
            hasRole(context, "SYSTEM") ||
            hasRole(context, "INGESTOR"),
          success: "Observation allowed",
          failure: "Observation role required",
        });

      case "FRAUD_RECOMMEND":
        return this.allowIf({
          condition:
            hasTrust(context, 30) ||
            hasRole(context, "SUPERVISOR"),
          success: "Recommendation allowed",
          failure: "Trust or supervisor role required",
        });

      case "FRAUD_SUPERVISE":
        return this.allowIf({
          condition:
            hasRole(context, "SUPERVISOR") &&
            hasVerification(context, 2),
          success: "Supervision allowed",
          failure: "Supervisor + verification required",
        });

      case "FRAUD_OVERRIDE":
        return this.allowIf({
          condition:
            hasRole(context, "ADMIN") &&
            hasVerification(context, 3),
          success: "Override allowed with audit",
          failure: "Admin + strong verification required",
          obligations: {
            audit: true,
            notifySupervisor: true,
            requireMFA: true,
          },
        });

      case "FRAUD_EXPORT":
        return this.allowIf({
          condition:
            hasRole(context, "AUDITOR"),
          success: "Export allowed",
          failure: "Auditor role required",
          obligations: {
            audit: true,
            watermarkResult: true,
          },
        });

      case "FRAUD_SANDBOX":
        return this.allowIf({
          condition:
            hasRole(context, "DEVELOPER") ||
            hasRole(context, "DATA_SCIENTIST"),
          success: "Sandbox allowed",
          failure: "Dev or Data role required",
        });

      default:
        return {
          decision: "DENY",
          reason: "Unknown capability",
        };
    }
  }

  /* ======================================================================== */
  /* HELPER                                                                   */
  /* ======================================================================== */

  private static allowIf(params: {
    condition: boolean;
    success: string;
    failure: string;
    obligations?: FraudPolicyResult["obligations"];
  }): FraudPolicyResult {
    if (params.condition) {
      return {
        decision: "ALLOW",
        reason: params.success,
        obligations: params.obligations,
      };
    }

    return {
      decision: "DENY",
      reason: params.failure,
      obligations: { audit: true },
    };
  }
}
