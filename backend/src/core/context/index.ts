/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE CORE — CONTEXT PUBLIC API (WORLD #1 FINAL)                     */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/context/index.ts                                   */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Exposer l’API publique officielle des Contexts                          */
/*   - Centraliser les exports                                                 */
/*   - Garantir la stabilité contractuelle                                     */
/*                                                                            */
/*  EXEMPLE :                                                                  */
/*   import {                                                                 */
/*     createRequestContext,                                                  */
/*     createAuthContext,                                                     */
/*     createTrustContext,                                                    */
/*     createAIContext,                                                       */
/*   } from "@/core/context";                                                  */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* REQUEST CONTEXT                                                           */
/* -------------------------------------------------------------------------- */

export {
  createRequestContext,
  isRequestContext,
  serializeRequestContext,
} from "./request.context";

export type {
  DeviceType,
  Locale,
  IpAddress,
  RequestMetaContext,
  RequestContext,
  CreateRequestContextParams,
} from "./request.context";

/* -------------------------------------------------------------------------- */
/* AUTH CONTEXT                                                              */
/* -------------------------------------------------------------------------- */

export {
  createAuthContext,
  ANONYMOUS_AUTH_CONTEXT,
  isAuthenticated,
  isPrivileged,
  serializeAuthContext,
} from "./auth.context";

export type {
  AuthProvider,
  AuthLevel,
  AuthSessionContext,
  CreateAuthContextParams,
} from "./auth.context";

/* -------------------------------------------------------------------------- */
/* IDENTITY CONTEXT                                                          */
/* -------------------------------------------------------------------------- */

export {
  GUEST_IDENTITY_CONTEXT,
  createUserIdentity,
  createOrganizationIdentity,
  createServiceIdentity,
  createSystemIdentity,
  isGuestIdentity,
  isUserIdentity,
  isOrganizationIdentity,
  isServiceIdentity,
  isSystemIdentity,
  serializeIdentityContext,
} from "./identity.context";

export type {
  IdentityKind,
  BaseIdentityContext,
  UserIdentityContext,
  OrganizationIdentityContext,
  ServiceIdentityContext,
  SystemIdentityContext,
  GuestIdentityContext,
  IdentityContext,
} from "./identity.context";

/* -------------------------------------------------------------------------- */
/* TRUST CONTEXT                                                             */
/* -------------------------------------------------------------------------- */

export {
  DEFAULT_TRUST_CONTEXT,
  createTrustContext,
  isHighTrust,
  isCriticalRisk,
  hasRiskFlag,
  serializeTrustContext,
} from "./trust.context";

export type {
  TrustLevel,
  TrustFlag,
  TrustContext,
  CreateTrustContextParams,
} from "./trust.context";

/* -------------------------------------------------------------------------- */
/* AI CONTEXT                                                                */
/* -------------------------------------------------------------------------- */

export {
  DEFAULT_AI_CONTEXT,
  createAIContext,
  hasHighConfidence,
  hasSignal,
  readMemory,
  serializeAIContext,
} from "./ai.context";

export type {
  AIProvider,
  AIConfidenceLevel,
  AISignal,
  AIPreferences,
  AIConstraints,
  AIMemory,
  AIContext,
  CreateAIContextParams,
} from "./ai.context";
