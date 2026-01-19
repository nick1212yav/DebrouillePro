/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE CORE — AUTH CONTEXT (WORLD #1 FINAL)                           */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/context/auth.context.ts                            */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Transporter l’état d’authentification                                  */
/*   - Exprimer le niveau de confiance de la session                          */
/*   - Isoler toute dépendance auth                                           */
/*                                                                            */
/*  CE CONTEXTE NE CONTIENT JAMAIS :                                           */
/*   - Permissions métier                                                     */
/*   - Décisions business                                                     */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* AUTH PROVIDERS                                                             */
/* -------------------------------------------------------------------------- */

export type AuthProvider =
  | "local"
  | "oauth"
  | "magic_link"
  | "api_key"
  | "sso"
  | "service";

/* -------------------------------------------------------------------------- */
/* AUTH LEVEL                                                                 */
/* -------------------------------------------------------------------------- */

export type AuthLevel =
  | "anonymous"
  | "weak"
  | "strong"
  | "privileged";

/* -------------------------------------------------------------------------- */
/* SESSION STATE                                                              */
/* -------------------------------------------------------------------------- */

export interface AuthSessionContext {
  /** Session identifier */
  readonly sessionId?: string;

  /** Authentication provider */
  readonly provider: AuthProvider;

  /** Level of authentication trust */
  readonly level: AuthLevel;

  /** Authentication timestamp */
  readonly authenticatedAt?: Date;

  /** Whether session is impersonated */
  readonly impersonated?: boolean;
}

/* -------------------------------------------------------------------------- */
/* DEFAULT CONTEXT                                                            */
/* -------------------------------------------------------------------------- */

export const ANONYMOUS_AUTH_CONTEXT: AuthSessionContext =
  Object.freeze({
    provider: "local",
    level: "anonymous",
  });

/* -------------------------------------------------------------------------- */
/* FACTORY                                                                    */
/* -------------------------------------------------------------------------- */

export interface CreateAuthContextParams {
  sessionId?: string;
  provider?: AuthProvider;
  level?: AuthLevel;
  authenticatedAt?: Date;
  impersonated?: boolean;
}

export const createAuthContext = (
  params?: CreateAuthContextParams
): AuthSessionContext => {
  if (!params) {
    return ANONYMOUS_AUTH_CONTEXT;
  }

  return Object.freeze({
    sessionId: params.sessionId,
    provider: params.provider ?? "local",
    level: params.level ?? "weak",
    authenticatedAt: params.authenticatedAt,
    impersonated: params.impersonated,
  });
};

/* -------------------------------------------------------------------------- */
/* TYPE GUARDS                                                                */
/* -------------------------------------------------------------------------- */

export const isAuthenticated = (
  ctx: AuthSessionContext
): boolean => ctx.level !== "anonymous";

export const isPrivileged = (
  ctx: AuthSessionContext
): boolean => ctx.level === "privileged";

/* -------------------------------------------------------------------------- */
/* SERIALIZATION                                                              */
/* -------------------------------------------------------------------------- */

export const serializeAuthContext = (
  ctx: AuthSessionContext
): Record<string, unknown> => ({
  sessionId: ctx.sessionId,
  provider: ctx.provider,
  level: ctx.level,
  authenticatedAt: ctx.authenticatedAt?.toISOString(),
  impersonated: ctx.impersonated,
});

/* -------------------------------------------------------------------------- */
/* PHILOSOPHIE                                                                */
/* -------------------------------------------------------------------------- */
/**
 * ✔️ Ce contexte est IMMUTABLE.
 * ✔️ Il décrit UNIQUEMENT l’état de la session.
 * ✔️ Il est enrichi par le middleware auth.
 * ✔️ Il est utilisé par Access / Trust / Audit.
 *
 * Toute logique métier est interdite ici.
 */
