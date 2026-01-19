/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE ACCESS — ACCESS ENGINE (WORLD #1 FINAL)                        */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/access/access.engine.ts                            */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE STRATÉGIQUE :                                                        */
/*   - Autorité UNIQUE de décision d’accès                                    */
/*   - Évalue uniquement des données (AccessRequest)                          */
/*   - Produit une décision déterministe, explicable, audit-ready             */
/*                                                                            */
/*  GARANTIES :                                                               */
/*   - Aucune dépendance HTTP / Express                                        */
/*   - Aucune logique métier                                                   */
/*   - 100 % policy-driven                                                     */
/*   - Zéro effet de bord                                                      */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  AccessRequest,
  AccessResult,
  AccessDecision,
  AccessCondition,
} from "./access.types";

import {
  AccessPolicyModel,
  AccessPolicyStatus,
  AccessPolicyScope,
  IAccessPolicy,
} from "./accessPolicy.model";

import {
  IdentityKind,
  VerificationLevel,
  OrgRole,
  IdentityContext,
} from "../identity/identity.types";

/* -------------------------------------------------------------------------- */
/* INTERNAL TYPES                                                             */
/* -------------------------------------------------------------------------- */

type ConditionEvaluation = {
  readonly condition: AccessCondition;
  readonly passed: boolean;
  readonly reason?: string;
};

type PolicyEvaluation = {
  readonly policyId: string;
  readonly applicable: boolean;
  readonly conditionResults: ReadonlyArray<ConditionEvaluation>;
  readonly granted: boolean;
};

/* -------------------------------------------------------------------------- */
/* CONDITION EVALUATORS (PURE FUNCTIONS)                                      */
/* -------------------------------------------------------------------------- */

/**
 * Évalue une condition atomique.
 * ⚠️ Fonction pure, déterministe, sans effet de bord.
 */
const evaluateCondition = (
  condition: AccessCondition,
  identity: IdentityContext
): ConditionEvaluation => {
  switch (condition.type) {
    /* ----------------------------- TRUST -------------------------------- */

    case "TRUST_MIN": {
      const passed =
        identity.trustScore >= condition.value;

      return {
        condition,
        passed,
        reason: passed
          ? undefined
          : `Trust score ${identity.trustScore} < ${condition.value}`,
      };
    }

    case "VERIFICATION_REQUIRED": {
      const passed = condition.value
        ? identity.verificationLevel !==
          VerificationLevel.NONE
        : true;

      return {
        condition,
        passed,
        reason: passed
          ? undefined
          : "Verification level insufficient",
      };
    }

    /* ---------------------- ORGANIZATION / ROLE -------------------------- */

    case "ROLE_REQUIRED": {
      const passed =
        identity.actingOrganization?.role ===
        condition.value;

      return {
        condition,
        passed,
        reason: passed
          ? undefined
          : `Required role: ${condition.value}`,
      };
    }

    case "OWNERSHIP_REQUIRED": {
      const passed =
        condition.value === true &&
        identity.actingOrganization?.role ===
          OrgRole.OWNER;

      return {
        condition,
        passed,
        reason: passed
          ? undefined
          : "Ownership required",
      };
    }

    /* -------------------------- CUSTOM ---------------------------------- */

    case "CUSTOM":
      /**
       * CUSTOM est volontairement bloqué ici :
       * - réservé aux extensions futures (IA, plugins, hooks)
       */
      return {
        condition,
        passed: false,
        reason: "Custom conditions are not supported",
      };

    default:
      return {
        condition,
        passed: false,
        reason: "Unknown condition type",
      };
  }
};

/* -------------------------------------------------------------------------- */
/* POLICY APPLICABILITY                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Vérifie si une politique s’applique au type d’identité.
 */
const isPolicyApplicable = (
  policy: IAccessPolicy,
  identityKind: IdentityKind
): boolean => {
  switch (policy.scope) {
    case AccessPolicyScope.GLOBAL:
      return true;

    case AccessPolicyScope.PERSON_ONLY:
      return identityKind === IdentityKind.PERSON;

    case AccessPolicyScope.ORGANIZATION_ONLY:
      return (
        identityKind === IdentityKind.ORGANIZATION
      );

    default:
      return false;
  }
};

/* -------------------------------------------------------------------------- */
/* POLICY EVALUATION                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Évalue une politique complète.
 */
const evaluatePolicy = (
  policy: IAccessPolicy,
  identity: IdentityContext,
  identityKind: IdentityKind
): PolicyEvaluation => {
  const applicable = isPolicyApplicable(
    policy,
    identityKind
  );

  if (!applicable) {
    return {
      policyId: policy.id,
      applicable: false,
      conditionResults: [],
      granted: false,
    };
  }

  const conditionResults =
    policy.conditions.map((condition) =>
      evaluateCondition(condition, identity)
    );

  const granted = conditionResults.every(
    (r) => r.passed
  );

  return {
    policyId: policy.id,
    applicable: true,
    conditionResults,
    granted,
  };
};

/* -------------------------------------------------------------------------- */
/* ACCESS ENGINE — SINGLE SOURCE OF TRUTH                                     */
/* -------------------------------------------------------------------------- */

export class AccessEngine {
  /**
   * Point d’entrée UNIQUE du moteur d’accès.
   */
  static async evaluate(
    request: AccessRequest
  ): Promise<AccessResult> {
    const { subject, target } = request;

    /* -------------------------------------------------------------------- */
    /* IDENTITY GUARD                                                        */
    /* -------------------------------------------------------------------- */

    const identity: IdentityContext | undefined =
      subject.identityContext;

    if (!identity) {
      return {
        decision: AccessDecision.DENY,
        reason: "Missing identity context",
        debug: {
          stage: "IDENTITY_GUARD",
        },
      };
    }

    const identityKind: IdentityKind =
      identity.identity.kind;

    /* -------------------------------------------------------------------- */
    /* LOAD POLICIES                                                         */
    /* -------------------------------------------------------------------- */

    const policies = await AccessPolicyModel.find({
      module: target.module,
      action: target.action,
      status: AccessPolicyStatus.ACTIVE,
    })
      .sort({ priority: -1 })
      .lean<IAccessPolicy[]>()
      .exec();

    if (policies.length === 0) {
      return {
        decision: AccessDecision.DENY,
        reason: "No access policy defined",
        debug: {
          stage: "NO_POLICY",
          module: target.module,
          action: target.action,
        },
      };
    }

    /* -------------------------------------------------------------------- */
    /* POLICY EVALUATION LOOP                                                */
    /* -------------------------------------------------------------------- */

    const evaluations: PolicyEvaluation[] = [];

    for (const policy of policies) {
      const evaluation = evaluatePolicy(
        policy,
        identity,
        identityKind
      );

      evaluations.push(evaluation);

      if (evaluation.granted) {
        return {
          decision: AccessDecision.ALLOW,
          reason:
            policy.description ??
            "Access granted by policy",
          policyId: policy.id,
          debug: {
            matchedPolicy: evaluation,
            evaluatedPolicies: evaluations,
          },
        };
      }
    }

    /* -------------------------------------------------------------------- */
    /* FALLBACK                                                              */
    /* -------------------------------------------------------------------- */

    const fallbackDecision =
      policies[0]?.fallbackDecision ??
      AccessDecision.DENY;

    return {
      decision: fallbackDecision,
      reason: "Access denied by policies",
      debug: {
        evaluatedPolicies: evaluations,
        fallbackDecision,
      },
    };
  }
}
