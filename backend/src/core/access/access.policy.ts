/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE ACCESS — ACCESS POLICY (WORLD #1 FINAL)                        */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/access/access.policy.ts                            */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Définir, valider et normaliser les politiques d’accès                   */
/*   - Empêcher toute politique incohérente                                   */
/*   - Garantir gouvernance, auditabilité, stabilité                           */
/*                                                                            */
/*  GARANTIES :                                                               */
/*   - Validation stricte (fail-fast)                                          */
/*   - Aucune dépendance Express                                               */
/*   - Compatible moteur déterministe                                          */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  AccessCondition,
  AccessDecision,
  AccessPolicyInput,
} from "./access.types";

import {
  AccessPolicyScope,
  AccessPolicyStatus,
  IAccessPolicy,
} from "./accessPolicy.model";

/* -------------------------------------------------------------------------- */
/* INTERNAL TYPES                                                             */
/* -------------------------------------------------------------------------- */

export type PolicyValidationResult = {
  readonly valid: boolean;
  readonly errors: ReadonlyArray<string>;
};

export type NormalizedPolicy = Omit<
  IAccessPolicy,
  "_id"
> & {
  readonly version: number;
};

/* -------------------------------------------------------------------------- */
/* VALIDATION RULES                                                           */
/* -------------------------------------------------------------------------- */

const MAX_CONDITIONS = 20;
const MAX_DESCRIPTION_LENGTH = 500;

/* -------------------------------------------------------------------------- */
/* CONDITION VALIDATION                                                       */
/* -------------------------------------------------------------------------- */

const validateCondition = (
  condition: AccessCondition,
  index: number
): string[] => {
  const errors: string[] = [];

  if (!condition.type) {
    errors.push(
      `conditions[${index}].type is required`
    );
  }

  switch (condition.type) {
    case "TRUST_MIN":
      if (
        typeof condition.value !== "number" ||
        condition.value < 0 ||
        condition.value > 100
      ) {
        errors.push(
          `conditions[${index}].value must be a number between 0 and 100`
        );
      }
      break;

    case "VERIFICATION_REQUIRED":
      if (typeof condition.value !== "boolean") {
        errors.push(
          `conditions[${index}].value must be boolean`
        );
      }
      break;

    case "ROLE_REQUIRED":
      if (!condition.value) {
        errors.push(
          `conditions[${index}].value must be a valid role`
        );
      }
      break;

    case "OWNERSHIP_REQUIRED":
      if (typeof condition.value !== "boolean") {
        errors.push(
          `conditions[${index}].value must be boolean`
        );
      }
      break;

    case "CUSTOM":
      /**
       * CUSTOM volontairement accepté mais non exécuté
       * par le moteur standard.
       */
      break;

    default:
      errors.push(
        `conditions[${index}].type is not supported`
      );
  }

  return errors;
};

/* -------------------------------------------------------------------------- */
/* POLICY VALIDATION                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Valider une politique avant persistance ou activation.
 */
export const validatePolicy = (
  policy: AccessPolicyInput
): PolicyValidationResult => {
  const errors: string[] = [];

  if (!policy.module) {
    errors.push("module is required");
  }

  if (!policy.action) {
    errors.push("action is required");
  }

  if (!policy.scope) {
    errors.push("scope is required");
  }

  if (
    policy.description &&
    policy.description.length >
      MAX_DESCRIPTION_LENGTH
  ) {
    errors.push(
      `description must be <= ${MAX_DESCRIPTION_LENGTH} characters`
    );
  }

  if (!Array.isArray(policy.conditions)) {
    errors.push("conditions must be an array");
  } else {
    if (policy.conditions.length === 0) {
      errors.push(
        "conditions must contain at least one condition"
      );
    }

    if (
      policy.conditions.length > MAX_CONDITIONS
    ) {
      errors.push(
        `conditions cannot exceed ${MAX_CONDITIONS} items`
      );
    }

    policy.conditions.forEach((condition, i) => {
      errors.push(
        ...validateCondition(condition, i)
      );
    });
  }

  if (
    policy.fallbackDecision &&
    !Object.values(AccessDecision).includes(
      policy.fallbackDecision
    )
  ) {
    errors.push(
      "fallbackDecision must be a valid AccessDecision"
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/* -------------------------------------------------------------------------- */
/* POLICY NORMALIZATION                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Normaliser une politique avant stockage.
 * - Valeurs par défaut
 * - Priorité cohérente
 * - Versionnage
 */
export const normalizePolicy = (
  policy: AccessPolicyInput
): NormalizedPolicy => {
  const validation = validatePolicy(policy);

  if (!validation.valid) {
    throw new Error(
      `Invalid access policy: ${validation.errors.join(
        " | "
      )}`
    );
  }

  return {
    module: policy.module.trim(),
    action: policy.action.trim(),
    scope: policy.scope ?? AccessPolicyScope.GLOBAL,
    status:
      policy.status ?? AccessPolicyStatus.DRAFT,

    description: policy.description?.trim(),

    priority:
      typeof policy.priority === "number"
        ? policy.priority
        : 0,

    fallbackDecision:
      policy.fallbackDecision ??
      AccessDecision.DENY,

    conditions: policy.conditions,

    version: 1,
  };
};

/* -------------------------------------------------------------------------- */
/* POLICY UTILITIES                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Incrémenter la version d’une politique.
 */
export const bumpPolicyVersion = (
  policy: NormalizedPolicy
): NormalizedPolicy => ({
  ...policy,
  version: policy.version + 1,
});

/**
 * Vérifier si une politique est activable.
 */
export const isPolicyActivable = (
  policy: Pick<
    NormalizedPolicy,
    "status" | "conditions"
  >
): boolean => {
  return (
    policy.status ===
      AccessPolicyStatus.DRAFT &&
    policy.conditions.length > 0
  );
};

/**
 * Calculer une clé canonique de politique.
 * Utile pour déduplication / cache / audit.
 */
export const buildPolicyKey = (
  policy: Pick<
    NormalizedPolicy,
    "module" | "action" | "scope"
  >
): string =>
  `${policy.module}:${policy.action}:${policy.scope}`;

/* -------------------------------------------------------------------------- */
/* CONVENTION                                                                 */
/* -------------------------------------------------------------------------- */
/**
 * ✅ Toute création / mise à jour de politique doit :
 *    1. passer par validatePolicy()
 *    2. être normalisée via normalizePolicy()
 *
 * ❌ Ne jamais écrire une politique brute en base.
 *
 * Ceci garantit :
 *  - Cohérence globale
 *  - Sécurité
 *  - Auditabilité
 *  - Évolutivité
 */
