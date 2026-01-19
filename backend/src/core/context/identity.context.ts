/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE CORE — IDENTITY CONTEXT (WORLD #1 FINAL)                       */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/context/identity.context.ts                        */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Représenter l’identité réellement résolue pour la requête              */
/*   - Unifier user / organization / service / system                         */
/*   - Servir de base aux décisions Access, Trust, Audit, IA                  */
/*                                                                            */
/*  CE CONTEXTE NE CONTIENT JAMAIS :                                           */
/*   - Tokens                                                                 */
/*   - Permissions calculées                                                  */
/*   - Règles métier                                                          */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { ID } from "../../shared/types";

/* -------------------------------------------------------------------------- */
/* IDENTITY TYPES                                                             */
/* -------------------------------------------------------------------------- */

export type IdentityKind =
  | "guest"
  | "user"
  | "organization"
  | "service"
  | "system";

/* -------------------------------------------------------------------------- */
/* BASE IDENTITY                                                              */
/* -------------------------------------------------------------------------- */

export interface BaseIdentityContext {
  /** Unique identity identifier */
  readonly id: ID;

  /** Identity kind */
  readonly kind: IdentityKind;

  /** Human readable display name */
  readonly displayName: string;

  /** Whether identity is verified */
  readonly verified: boolean;

  /** Creation timestamp */
  readonly createdAt?: Date;
}

/* -------------------------------------------------------------------------- */
/* USER IDENTITY                                                              */
/* -------------------------------------------------------------------------- */

export interface UserIdentityContext
  extends BaseIdentityContext {
  readonly kind: "user";
  readonly email?: string;
  readonly phone?: string;
}

/* -------------------------------------------------------------------------- */
/* ORGANIZATION IDENTITY                                                      */
/* -------------------------------------------------------------------------- */

export interface OrganizationIdentityContext
  extends BaseIdentityContext {
  readonly kind: "organization";
  readonly legalName?: string;
  readonly country?: string;
}

/* -------------------------------------------------------------------------- */
/* SERVICE IDENTITY                                                           */
/* -------------------------------------------------------------------------- */

export interface ServiceIdentityContext
  extends BaseIdentityContext {
  readonly kind: "service";
  readonly serviceName: string;
  readonly version?: string;
}

/* -------------------------------------------------------------------------- */
/* SYSTEM IDENTITY                                                            */
/* -------------------------------------------------------------------------- */

export interface SystemIdentityContext
  extends BaseIdentityContext {
  readonly kind: "system";
}

/* -------------------------------------------------------------------------- */
/* GUEST IDENTITY                                                             */
/* -------------------------------------------------------------------------- */

export interface GuestIdentityContext
  extends BaseIdentityContext {
  readonly kind: "guest";
}

/* -------------------------------------------------------------------------- */
/* UNION                                                                      */
/* -------------------------------------------------------------------------- */

export type IdentityContext =
  | GuestIdentityContext
  | UserIdentityContext
  | OrganizationIdentityContext
  | ServiceIdentityContext
  | SystemIdentityContext;

/* -------------------------------------------------------------------------- */
/* DEFAULT GUEST                                                              */
/* -------------------------------------------------------------------------- */

export const GUEST_IDENTITY_CONTEXT: GuestIdentityContext =
  Object.freeze({
    id: "GUEST",
    kind: "guest",
    displayName: "Guest",
    verified: false,
  });

/* -------------------------------------------------------------------------- */
/* FACTORIES                                                                  */
/* -------------------------------------------------------------------------- */

export const createUserIdentity = (
  params: Omit<
    UserIdentityContext,
    "kind"
  >
): UserIdentityContext =>
  Object.freeze({
    ...params,
    kind: "user",
  });

export const createOrganizationIdentity = (
  params: Omit<
    OrganizationIdentityContext,
    "kind"
  >
): OrganizationIdentityContext =>
  Object.freeze({
    ...params,
    kind: "organization",
  });

export const createServiceIdentity = (
  params: Omit<
    ServiceIdentityContext,
    "kind"
  >
): ServiceIdentityContext =>
  Object.freeze({
    ...params,
    kind: "service",
  });

export const createSystemIdentity = (
  params: Omit<
    SystemIdentityContext,
    "kind"
  >
): SystemIdentityContext =>
  Object.freeze({
    ...params,
    kind: "system",
  });

/* -------------------------------------------------------------------------- */
/* TYPE GUARDS                                                                */
/* -------------------------------------------------------------------------- */

export const isGuestIdentity = (
  ctx: IdentityContext
): ctx is GuestIdentityContext =>
  ctx.kind === "guest";

export const isUserIdentity = (
  ctx: IdentityContext
): ctx is UserIdentityContext =>
  ctx.kind === "user";

export const isOrganizationIdentity = (
  ctx: IdentityContext
): ctx is OrganizationIdentityContext =>
  ctx.kind === "organization";

export const isServiceIdentity = (
  ctx: IdentityContext
): ctx is ServiceIdentityContext =>
  ctx.kind === "service";

export const isSystemIdentity = (
  ctx: IdentityContext
): ctx is SystemIdentityContext =>
  ctx.kind === "system";

/* -------------------------------------------------------------------------- */
/* SERIALIZATION                                                              */
/* -------------------------------------------------------------------------- */

export const serializeIdentityContext = (
  ctx: IdentityContext
): Record<string, unknown> => ({
  id: ctx.id,
  kind: ctx.kind,
  displayName: ctx.displayName,
  verified: ctx.verified,
});

/* -------------------------------------------------------------------------- */
/* PHILOSOPHIE                                                                */
/* -------------------------------------------------------------------------- */
/**
 * ✔️ Identité strictement IMMUTABLE.
 * ✔️ Ne transporte aucune permission.
 * ✔️ Peut être propagée dans events, audit, logs.
 * ✔️ Supporte multi-identité mondiale.
 */
