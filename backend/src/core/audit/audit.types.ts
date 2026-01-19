/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE CORE — AUDIT TYPES (WORLD #1 FINAL)                            */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/audit/audit.types.ts                               */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Définir le contrat universel d’audit                                    */
/*   - Garantir la traçabilité légale, sécurité et conformité                  */
/*   - Supporter SIEM, forensic, analytics, gouvernance                        */
/*                                                                            */
/*  PRINCIPES :                                                               */
/*   - Immuabilité logique                                                     */
/*   - Typage strict                                                          */
/*   - Indépendance métier                                                    */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  ID,
  ISODateString,
  JsonValue,
} from "../../shared/types";

/* -------------------------------------------------------------------------- */
/* AUDIT DOMAIN                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Domaine fonctionnel de l’événement audité.
 */
export type AuditDomain =
  | "auth"
  | "identity"
  | "access"
  | "trust"
  | "ai"
  | "pay"
  | "system"
  | "security"
  | "api"
  | "job"
  | "integration";

/* -------------------------------------------------------------------------- */
/* AUDIT SEVERITY                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Niveau de criticité de l’événement.
 */
export type AuditSeverity =
  | "DEBUG"
  | "INFO"
  | "NOTICE"
  | "WARNING"
  | "ERROR"
  | "CRITICAL";

/* -------------------------------------------------------------------------- */
/* AUDIT ACTOR                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Acteur à l’origine de l’événement.
 */
export interface AuditActor {
  readonly id?: ID;
  readonly type:
    | "USER"
    | "ORGANIZATION"
    | "SERVICE"
    | "SYSTEM"
    | "ANONYMOUS";
  readonly label?: string;
  readonly ip?: string;
  readonly userAgent?: string;
}

/* -------------------------------------------------------------------------- */
/* AUDIT TARGET                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Ressource impactée par l’événement.
 */
export interface AuditTarget {
  readonly id?: ID;
  readonly type:
    | "USER"
    | "ORGANIZATION"
    | "WALLET"
    | "TRANSACTION"
    | "DOCUMENT"
    | "SESSION"
    | "RESOURCE"
    | "CONFIG"
    | "MODEL";
  readonly label?: string;
}

/* -------------------------------------------------------------------------- */
/* AUDIT CONTEXT                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Contexte technique enrichi.
 */
export interface AuditContext {
  readonly requestId?: string;
  readonly traceId?: string;
  readonly sessionId?: string;
  readonly correlationId?: string;

  readonly locale?: string;
  readonly device?: string;

  readonly metadata?: Record<string, JsonValue>;
}

/* -------------------------------------------------------------------------- */
/* AUDIT EVENT                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Événement d’audit canonique.
 */
export interface AuditEvent<TPayload = JsonValue> {
  readonly id: ID;

  readonly domain: AuditDomain;
  readonly action: string;
  readonly severity: AuditSeverity;

  readonly actor: AuditActor;
  readonly target?: AuditTarget;

  readonly payload?: TPayload;
  readonly context?: AuditContext;

  readonly occurredAt: ISODateString;
  readonly recordedAt: ISODateString;
}

/* -------------------------------------------------------------------------- */
/* AUDIT QUERY                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Filtrage avancé pour recherche d’audit.
 */
export interface AuditQuery {
  readonly domain?: AuditDomain;
  readonly severity?: AuditSeverity;

  readonly actorId?: ID;
  readonly targetId?: ID;

  readonly fromDate?: ISODateString;
  readonly toDate?: ISODateString;

  readonly text?: string;

  readonly limit?: number;
  readonly offset?: number;
}

/* -------------------------------------------------------------------------- */
/* AUDIT METRICS                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Statistiques agrégées d’audit.
 */
export interface AuditMetrics {
  readonly totalEvents: number;
  readonly byDomain: Partial<
    Record<AuditDomain, number>
  >;
  readonly bySeverity: Partial<
    Record<AuditSeverity, number>
  >;
}

/* -------------------------------------------------------------------------- */
/* AUDIT UTILS                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Générer un timestamp ISO fiable.
 */
export const nowISO = (): ISODateString =>
  new Date().toISOString();

/**
 * Sévérité par défaut selon le domaine.
 */
export const defaultSeverityForDomain = (
  domain: AuditDomain
): AuditSeverity => {
  switch (domain) {
    case "security":
    case "pay":
      return "CRITICAL";

    case "auth":
    case "access":
      return "WARNING";

    case "system":
    case "integration":
      return "NOTICE";

    default:
      return "INFO";
  }
};
