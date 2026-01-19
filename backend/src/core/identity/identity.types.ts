/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE IDENTITY — TYPES & CONTRACTS (WORLD #1 CANONICAL)              */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/identity/identity.types.ts                         */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE CONSTITUTIONNEL :                                                    */
/*   - Définir l'identité universelle de toute action système                 */
/*   - Normaliser PERSON / ORGANIZATION / GUEST                               */
/*   - Être la SOURCE UNIQUE pour Auth, Access, Trust, Pay, AI, Audit         */
/*                                                                            */
/*  PHILOSOPHIE :                                                             */
/*   - Toute action a une identité explicite                                  */
/*   - Toute identité est traçable                                            */
/*   - Toute décision est explicable                                          */
/*                                                                            */
/*  ⚠️ AUCUNE LOGIQUE MÉTIER ICI                                               */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Types } from "mongoose";

/* -------------------------------------------------------------------------- */
/* IDENTITY KIND                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Nature fondamentale d’une identité.
 */
export enum IdentityKind {
  PERSON = "PERSON",
  ORGANIZATION = "ORGANIZATION",
  GUEST = "GUEST",
}

/* -------------------------------------------------------------------------- */
/* TRUST & VERIFICATION                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Niveau de vérification officiel.
 * Peut être étendu sans casser la compatibilité.
 */
export enum VerificationLevel {
  NONE = "NONE",
  BASIC = "BASIC",
  LEGAL = "LEGAL",
  INSTITUTIONAL = "INSTITUTIONAL",
}

/**
 * TrustScore universel (0 → 100).
 * ⚠️ Calculé exclusivement côté serveur / IA / règles.
 */
export type TrustScore = number;

/**
 * Normalisation mathématique du trust.
 */
export const TRUST_SCORE_RANGE = {
  MIN: 0,
  MAX: 100,
  DEFAULT: 0,
} as const;

/* -------------------------------------------------------------------------- */
/* ORGANIZATION ROLES                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Rôles organisationnels globaux.
 * Les permissions fines sont gérées ailleurs (Access).
 */
export enum OrgRole {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  STAFF = "STAFF",
  MEMBER = "MEMBER",
  AUDITOR = "AUDITOR",
  SYSTEM = "SYSTEM",
}

/* -------------------------------------------------------------------------- */
/* IDENTITY REFERENCES (IMMUTABLE CORE)                                       */
/* -------------------------------------------------------------------------- */

/**
 * Identité PERSON.
 */
export type PersonIdentityRef = Readonly<{
  kind: IdentityKind.PERSON;
  userId: Types.ObjectId;
}>;

/**
 * Identité ORGANIZATION.
 */
export type OrganizationIdentityRef = Readonly<{
  kind: IdentityKind.ORGANIZATION;
  organizationId: Types.ObjectId;
}>;

/**
 * Identité GUEST (anonyme, éphémère).
 */
export type GuestIdentityRef = Readonly<{
  kind: IdentityKind.GUEST;
  deviceId?: string;
  ipHash?: string;
  fingerprint?: string;
}>;

/**
 * Union canonique.
 */
export type IdentityRef =
  | PersonIdentityRef
  | OrganizationIdentityRef
  | GuestIdentityRef;

/* -------------------------------------------------------------------------- */
/* ACTING ORGANIZATION CONTEXT                                                */
/* -------------------------------------------------------------------------- */

/**
 * Lorsqu’un utilisateur agit AU NOM d’une organisation.
 */
export interface ActingOrganizationContext {
  organizationId: Types.ObjectId;
  role: OrgRole;

  /**
   * Permissions dynamiques optionnelles (override).
   */
  permissionsOverride?: string[];
}

/* -------------------------------------------------------------------------- */
/* IDENTITY CONTEXT (EXECUTION CONTRACT)                                      */
/* -------------------------------------------------------------------------- */

/**
 * Contexte d'identité RÉSOLU côté serveur.
 * 👉 Injecté par Auth → consommé partout.
 */
export interface IdentityContext {
  /**
   * Identité fondamentale.
   */
  identity: IdentityRef;

  /**
   * Présent uniquement si action déléguée.
   */
  actingOrganization?: ActingOrganizationContext;

  /**
   * Score de confiance calculé dynamiquement.
   */
  trustScore: TrustScore;

  /**
   * Niveau de vérification officiel.
   */
  verificationLevel: VerificationLevel;

  /**
   * Signaux optionnels d’environnement.
   */
  signals?: {
    ipCountry?: string;
    deviceRisk?: "LOW" | "MEDIUM" | "HIGH";
    vpnDetected?: boolean;
    lastSeenAt?: Date;
  };
}

/* -------------------------------------------------------------------------- */
/* MODULES DECLARATION                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Tous les modules backend officiels.
 * ⚠️ L’extensibilité volontaire évite les blocages TS.
 */
export type ModuleName =
  | "ai"
  | "auth"
  | "api"
  | "home"
  | "contact"
  | "annonces"
  | "boutique"
  | "agri"
  | "business-institutions"
  | "city-habitat"
  | "community"
  | "doc"
  | "event"
  | "health"
  | "job"
  | "justice"
  | "learn"
  | "live"
  | "livraison"
  | "pay"
  | "profile"
  | "services"
  | "talents"
  | "tracking"
  | "transport"
  | "voyages"
  | "ecole"
  | "eglise"
  | "media"
  | "pub"
  | "ong"
  | "map-3d"
  | "finances-avancees"
  | "data-publique";

/**
 * Actions génériques inter-modules.
 */
export type ModuleAction =
  | "VIEW"
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "PUBLISH"
  | "APPLY"
  | "MANAGE"
  | "PAY"
  | "VERIFY"
  | "AUDIT"
  | "EXPORT"
  | "IMPORT"
  | "APPROVE"
  | "REJECT";

/* -------------------------------------------------------------------------- */
/* IDENTITY EVENTS (AUDIT READY)                                              */
/* -------------------------------------------------------------------------- */

/**
 * Événements d’identité traçables.
 */
export interface IdentityEvent {
  event:
    | "USER_CREATED"
    | "USER_SUSPENDED"
    | "ORGANIZATION_CREATED"
    | "ORGANIZATION_SUSPENDED"
    | "MEMBERSHIP_ADDED"
    | "MEMBERSHIP_REVOKED"
    | "CONTEXT_SWITCHED"
    | "TRUST_UPDATED"
    | "VERIFICATION_UPDATED";

  actor: IdentityRef;
  target?: IdentityRef;

  metadata?: Record<string, unknown>;

  at: Date;
}

/* -------------------------------------------------------------------------- */
/* INVARIANTS CONSTITUTIONNELS                                                 */
/* -------------------------------------------------------------------------- */

export const IDENTITY_INVARIANTS = {
  GUEST_IS_EPHEMERAL: true,
  TRUST_IS_SERVER_CALCULATED: true,
  ORGANIZATION_ACTIONS_REQUIRE_PERSON: true,
  IDENTITY_REF_IS_IMMUTABLE: true,
  ALL_ACTIONS_REQUIRE_CONTEXT: true,
} as const;

/* -------------------------------------------------------------------------- */
/* TYPE GUARDS (SAFE & PURE)                                                   */
/* -------------------------------------------------------------------------- */

export const isPerson = (
  ref: IdentityRef
): ref is PersonIdentityRef =>
  ref.kind === IdentityKind.PERSON;

export const isOrganization = (
  ref: IdentityRef
): ref is OrganizationIdentityRef =>
  ref.kind === IdentityKind.ORGANIZATION;

export const isGuest = (
  ref: IdentityRef
): ref is GuestIdentityRef =>
  ref.kind === IdentityKind.GUEST;

/**
 * Vérifie si l’identité agit pour une organisation.
 */
export const isActingForOrganization = (
  ctx: IdentityContext
): boolean =>
  Boolean(ctx.actingOrganization);

/* -------------------------------------------------------------------------- */
/* SERIALIZATION HELPERS                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Convertit une IdentityRef en string stable (logs, cache, audit).
 */
export const identityToKey = (
  ref: IdentityRef
): string => {
  switch (ref.kind) {
    case IdentityKind.PERSON:
      return `PERSON:${ref.userId.toHexString()}`;

    case IdentityKind.ORGANIZATION:
      return `ORG:${ref.organizationId.toHexString()}`;

    case IdentityKind.GUEST:
      return `GUEST:${ref.deviceId ?? "anon"}`;

    default:
      return "UNKNOWN";
  }
};
