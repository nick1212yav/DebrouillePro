/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE ACCESS — TYPES & CONTRACTS (WORLD #1 CANONICAL)                */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/access/access.types.ts                             */
/* -------------------------------------------------------------------------- */

import {
  IdentityContext,
  IdentityRef,
  ModuleName,
  ModuleAction,
} from "../identity/identity.types";

/* -------------------------------------------------------------------------- */
/* ACCESS SUBJECT                                                             */
/* -------------------------------------------------------------------------- */

export interface AccessSubject {
  /**
   * Contexte d’identité canonique.
   */
  readonly identityContext: IdentityContext;

  /**
   * Source technique de la requête.
   */
  readonly channel?:
    | "API"
    | "WEB"
    | "MOBILE"
    | "WORKER"
    | "SYSTEM"
    | "AI";

  /**
   * Traçabilité transversale.
   */
  readonly traceId?: string;
}

/* -------------------------------------------------------------------------- */
/* ACCESS TARGET                                                              */
/* -------------------------------------------------------------------------- */

export interface AccessTarget {
  /**
   * Module fonctionnel.
   */
  readonly module: ModuleName;

  /**
   * Action métier.
   */
  readonly action: ModuleAction;

  /**
   * Ressource ciblée (optionnelle).
   */
  readonly resourceId?: string;

  /**
   * Contexte enrichi serveur.
   * ⚠️ Jamais issu directement du client.
   */
  readonly context?: Record<string, unknown>;
}

/* -------------------------------------------------------------------------- */
/* ACCESS REQUEST                                                             */
/* -------------------------------------------------------------------------- */

export interface AccessRequest {
  readonly subject: AccessSubject;
  readonly target: AccessTarget;

  /**
   * Horodatage de la demande.
   */
  readonly requestedAt?: Date;
}

/* -------------------------------------------------------------------------- */
/* ACCESS DECISION CODES                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Code canonique d’une décision d’accès.
 */
export enum AccessDecisionCode {
  /**
   * Accès autorisé sans restriction.
   */
  ALLOW = "ALLOW",

  /**
   * Accès autorisé avec limitations.
   */
  LIMIT = "LIMIT",

  /**
   * Accès refusé.
   */
  DENY = "DENY",

  /**
   * Accès refusé mais recommandation possible.
   */
  RECOMMEND = "RECOMMEND",
}

/**
 * Niveau de sévérité d’une décision.
 */
export enum AccessSeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

/* -------------------------------------------------------------------------- */
/* ACCESS DECISION RESULT (CANONICAL OBJECT)                                  */
/* -------------------------------------------------------------------------- */

/**
 * Résultat standardisé du moteur d’accès.
 * 👉 C’est CE TYPE qui doit être utilisé partout dans le code métier.
 */
export interface AccessResult {
  /**
   * Décision finale.
   */
  readonly decision: AccessDecisionCode;

  /**
   * Raison explicable (UX, audit, IA).
   */
  readonly reason?: string;

  /**
   * Niveau de sévérité.
   */
  readonly severity?: AccessSeverity;

  /**
   * Limitations appliquées (quota, champs, portée).
   */
  readonly limits?: Record<string, unknown>;

  /**
   * Recommandations système / IA.
   */
  readonly recommendations?: string[];

  /**
   * Métadonnées internes (debug, tracing).
   */
  readonly meta?: Record<string, unknown>;
}

/**
 * Alias rétro-compatible :
 * Dans tout le projet, AccessDecision = AccessResult (objet riche).
 */
export type AccessDecision = AccessResult;

/* -------------------------------------------------------------------------- */
/* ACCESS CONDITIONS                                                          */
/* -------------------------------------------------------------------------- */

export type AccessCondition =
  | {
      readonly type: "TRUST_MIN";
      readonly value: number; // 0 → 100
    }
  | {
      readonly type: "VERIFICATION_REQUIRED";
      readonly value: boolean;
    }
  | {
      readonly type: "ROLE_REQUIRED";
      readonly value: string;
    }
  | {
      readonly type: "OWNERSHIP_REQUIRED";
      readonly value: boolean;
    }
  | {
      readonly type: "CUSTOM";
      readonly value: string;
    };

/* -------------------------------------------------------------------------- */
/* ACCESS POLICY CONTRACT                                                     */
/* -------------------------------------------------------------------------- */

export interface AccessPolicyRule {
  readonly module: ModuleName;
  readonly action: ModuleAction;

  /**
   * Conditions cumulatives (AND).
   */
  readonly conditions: ReadonlyArray<AccessCondition>;

  /**
   * Décision fallback si aucune règle ne match.
   */
  readonly fallbackDecision: AccessDecisionCode;

  /**
   * Message humain explicatif.
   */
  readonly message?: string;

  /**
   * Priorité de la règle (plus élevé = évalué en premier).
   */
  readonly priority?: number;
}

/* -------------------------------------------------------------------------- */
/* ACCESS EVENTS                                                              */
/* -------------------------------------------------------------------------- */

export interface AccessEvent {
  readonly module: ModuleName;
  readonly action: ModuleAction;

  readonly decision: AccessDecisionCode;
  readonly severity?: AccessSeverity;

  /**
   * Identité ayant initié l’action.
   */
  readonly actor: IdentityRef;

  /**
   * Cible de l’action.
   */
  readonly target?: {
    readonly resourceId?: string;
    readonly context?: Record<string, unknown>;
  };

  /**
   * Justification.
   */
  readonly reason?: string;

  /**
   * Timestamp.
   */
  readonly at: Date;

  /**
   * Trace technique.
   */
  readonly traceId?: string;
}

/* -------------------------------------------------------------------------- */
/* ACCESS LIMIT MODELS                                                        */
/* -------------------------------------------------------------------------- */

export interface AccessQuotaLimit {
  readonly type: "QUOTA";
  readonly max: number;
  readonly remaining: number;
  readonly resetAt: Date;
}

export interface AccessScopeLimit {
  readonly type: "SCOPE";
  readonly allowedFields?: string[];
  readonly deniedFields?: string[];
}

export type AccessLimit =
  | AccessQuotaLimit
  | AccessScopeLimit;

/* -------------------------------------------------------------------------- */
/* ADVANCED DECISION PAYLOAD                                                  */
/* -------------------------------------------------------------------------- */

export interface AdvancedAccessResult extends AccessResult {
  readonly evaluatedPolicies?: string[];
  readonly matchedConditions?: string[];
  readonly executionTimeMs?: number;
  readonly cacheHit?: boolean;
}

/* -------------------------------------------------------------------------- */
/* INVARIANTS                                                                 */
/* -------------------------------------------------------------------------- */

export const ACCESS_INVARIANTS = {
  ALL_DECISIONS_ARE_SERVER_SIDE: true,
  MODULES_NEVER_OVERRIDE_ENGINE: true,
  POLICIES_ARE_DATA_DRIVEN: true,
  DECISIONS_ARE_EXPLAINABLE: true,
  AUDIT_IS_MANDATORY: true,
  ZERO_CLIENT_TRUST: true,
} as const;

/* -------------------------------------------------------------------------- */
/* TYPE GUARDS                                                                */
/* -------------------------------------------------------------------------- */

export const isBlockingDecision = (
  decision: AccessDecisionCode
): boolean =>
  decision === AccessDecisionCode.DENY ||
  decision === AccessDecisionCode.RECOMMEND;

export const isAllowDecision = (
  decision: AccessDecisionCode
): boolean =>
  decision === AccessDecisionCode.ALLOW ||
  decision === AccessDecisionCode.LIMIT;
