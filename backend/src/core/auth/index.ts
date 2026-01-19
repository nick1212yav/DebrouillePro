/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE CORE — AUTH PUBLIC API (WORLD #1 FINAL)                        */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/auth/index.ts                                      */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Exposer l’API publique officielle du module Auth                       */
/*   - Garantir la stabilité contractuelle                                   */
/*   - Interdire les imports directs internes                                 */
/*                                                                            */
/*  RÈGLE D’OR :                                                              */
/*   ✅ Toujours importer depuis "@/core/auth"                                */
/*   ❌ Ne jamais importer depuis des sous-fichiers directement               */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* TYPES & CONTRACTS                                                         */
/* -------------------------------------------------------------------------- */

export type {
  AuthSession,
  LoginInput,
  LoginResult,
  BaseJwtPayload,
  AccessTokenPayload,
  RefreshTokenPayload,
} from "./auth.types";

export {
  AuthProvider,
  TokenType,
  SessionStatus,
  AuthErrorCode,
  AUTH_INVARIANTS,
} from "./auth.types";

/* -------------------------------------------------------------------------- */
/* MODELS                                                                     */
/* -------------------------------------------------------------------------- */

export {
  AuthSessionModel,
} from "./auth.session.model";

export type {
  IAuthSession,
  DeviceContext,
  AuthSessionModelType,
} from "./auth.session.model";

/* -------------------------------------------------------------------------- */
/* SERVICES                                                                   */
/* -------------------------------------------------------------------------- */

export {
  AuthService,
} from "./auth.service";

/* -------------------------------------------------------------------------- */
/* MIDDLEWARES                                                                */
/* -------------------------------------------------------------------------- */

export {
  authMiddleware,
  requireAuth,
} from "./auth.middleware";

/* -------------------------------------------------------------------------- */
/* CONTROLLERS                                                                */
/* -------------------------------------------------------------------------- */

export {
  AuthController,
} from "./auth.controller";

/* -------------------------------------------------------------------------- */
/* ROUTERS                                                                    */
/* -------------------------------------------------------------------------- */

export {
  default as authRouter,
} from "./auth.routes";

/* -------------------------------------------------------------------------- */
/* CONTRACT GUARANTEES                                                       */
/* -------------------------------------------------------------------------- */
/**
 * ✔️ Aucune dépendance externe exposée
 * ✔️ Toutes les APIs publiques sont explicitement exportées
 * ✔️ Refactorisation interne sans breaking changes
 * ✔️ Compatible monorepo / microservices / SDK
 *
 * 👉 Ce fichier est la frontière contractuelle du module AUTH.
 */
