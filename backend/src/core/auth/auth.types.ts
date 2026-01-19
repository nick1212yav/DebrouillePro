/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE AUTH — TYPES & CONTRACTS (WORLD #1 CANONICAL)                  */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/auth/auth.types.ts                                 */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE STRATÉGIQUE :                                                        */
/*   - Définir le CONTRAT ABSOLU d’authentification                            */
/*   - Séparer strictement identité / session / token / device               */
/*   - Garantir sécurité, auditabilité, évolutivité                           */
/*                                                                            */
/*  GARANTIES :                                                               */
/*   - Aucun secret stocké en clair                                           */
/*   - Aucun droit dans les tokens                                            */
/*   - Sessions toujours révocables                                           */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Types } from "mongoose";
import {
  IdentityContext,
  IdentityRef,
} from "../identity/identity.types";

/* -------------------------------------------------------------------------- */
/* AUTH PROVIDERS                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Méthode d’authentification utilisée.
 */
export enum AuthProvider {
  PASSWORD = "PASSWORD",
  OTP = "OTP",
  OAUTH = "OAUTH",
  DEVICE = "DEVICE",
  BIOMETRIC = "BIOMETRIC",
}

/* -------------------------------------------------------------------------- */
/* TOKEN TYPES                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Type de jeton JWT.
 */
export enum TokenType {
  ACCESS = "ACCESS",
  REFRESH = "REFRESH",
}

/* -------------------------------------------------------------------------- */
/* SESSION STATUS                                                             */
/* -------------------------------------------------------------------------- */

/**
 * État de vie d’une session serveur.
 */
export enum SessionStatus {
  ACTIVE = "ACTIVE",
  REVOKED = "REVOKED",
  EXPIRED = "EXPIRED",
  COMPROMISED = "COMPROMISED",
}

/* -------------------------------------------------------------------------- */
/* DEVICE CONTEXT                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Empreinte logique d’un appareil.
 */
export interface DeviceContext {
  readonly deviceId?: string;
  readonly deviceName?: string;
  readonly platform?: "WEB" | "MOBILE" | "API" | "IOT";
  readonly os?: string;
  readonly appVersion?: string;
}

/* -------------------------------------------------------------------------- */
/* AUTH SESSION (PERSISTED — SERVER SIDE)                                     */
/* -------------------------------------------------------------------------- */

/**
 * Session serveur persistée.
 * ⚠️ Aucun token brut n’est stocké.
 */
export interface AuthSession {
  readonly _id: Types.ObjectId;

  /**
   * Identité propriétaire de la session.
   */
  readonly identity: IdentityRef;

  /**
   * Méthode d’authentification.
   */
  readonly provider: AuthProvider;

  /**
   * Hashs cryptographiques des tokens.
   */
  readonly accessTokenHash: string;
  readonly refreshTokenHash: string;

  /**
   * Contexte appareil.
   */
  readonly device?: DeviceContext;

  /**
   * Métadonnées réseau.
   */
  readonly ipAddress?: string;
  readonly userAgent?: string;

  /**
   * Cycle de vie.
   */
  readonly status: SessionStatus;

  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly lastUsedAt?: Date;

  /**
   * Détection sécurité.
   */
  readonly compromisedAt?: Date;
}

/* -------------------------------------------------------------------------- */
/* JWT PAYLOADS (STRICT & MINIMAL)                                            */
/* -------------------------------------------------------------------------- */

/**
 * Payload minimal commun.
 * ⚠️ Aucun champ métier, aucun rôle, aucune permission.
 */
export interface BaseJwtPayload {
  /**
   * Identifiant de session.
   */
  readonly sub: string;

  /**
   * Type du token.
   */
  readonly typ: TokenType;

  /**
   * Issued at (epoch seconds).
   */
  readonly iat?: number;

  /**
   * Expiration (epoch seconds).
   */
  readonly exp?: number;

  /**
   * Identifiant unique du token (anti-replay).
   */
  readonly jti?: string;
}

/**
 * Payload Access Token.
 */
export interface AccessTokenPayload
  extends BaseJwtPayload {
  readonly typ: TokenType.ACCESS;
}

/**
 * Payload Refresh Token.
 */
export interface RefreshTokenPayload
  extends BaseJwtPayload {
  readonly typ: TokenType.REFRESH;
}

/* -------------------------------------------------------------------------- */
/* INPUT CONTRACTS                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Payload canonique de login.
 */
export interface LoginInput {
  readonly phone?: string;
  readonly email?: string;
  readonly password?: string;
  readonly otp?: string;

  readonly deviceId?: string;
  readonly deviceName?: string;
}

/**
 * Paramètres de rafraîchissement de session.
 */
export interface RefreshInput {
  readonly refreshToken: string;
}

/* -------------------------------------------------------------------------- */
/* OUTPUT CONTRACTS                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Résultat officiel d’authentification.
 * Contrat unique frontend / mobile / partenaires.
 */
export interface LoginResult {
  /**
   * JWT court.
   */
  readonly accessToken: string;

  /**
   * JWT long.
   */
  readonly refreshToken: string;

  /**
   * Durée de validité en secondes.
   */
  readonly expiresIn: number;

  /**
   * Session serveur (audit / sécurité).
   */
  readonly sessionId: string;

  /**
   * Contexte d’identité résolu.
   */
  readonly identityContext: IdentityContext;

  /**
   * Métadonnées optionnelles (ex: MFA, onboarding).
   */
  readonly meta?: Record<string, unknown>;
}

/* -------------------------------------------------------------------------- */
/* ERROR CODES                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Codes d’erreurs stables et contractuels.
 */
export enum AuthErrorCode {
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  USER_SUSPENDED = "USER_SUSPENDED",
  SESSION_REVOKED = "SESSION_REVOKED",
  SESSION_COMPROMISED = "SESSION_COMPROMISED",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",
  TOKEN_INVALID = "TOKEN_INVALID",
  TOKEN_REUSED = "TOKEN_REUSED",
  UNAUTHORIZED = "UNAUTHORIZED",
  RATE_LIMITED = "RATE_LIMITED",
}

/* -------------------------------------------------------------------------- */
/* EVENTS                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Événement d’authentification (audit / sécurité).
 */
export interface AuthEvent {
  readonly type:
    | "LOGIN_SUCCESS"
    | "LOGIN_FAILED"
    | "LOGOUT"
    | "REFRESH"
    | "SESSION_REVOKED"
    | "SECURITY_ALERT";

  readonly identity?: IdentityRef;
  readonly sessionId?: string;
  readonly provider?: AuthProvider;
  readonly device?: DeviceContext;
  readonly ipAddress?: string;
  readonly reason?: string;
  readonly at: Date;
}

/* -------------------------------------------------------------------------- */
/* INVARIANTS CONSTITUTIONNELS                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Règles non négociables du système d’authentification.
 */
export const AUTH_INVARIANTS = {
  TOKENS_ARE_STATELESS_BUT_SESSIONS_ARE_STATEFUL: true,
  PERMISSIONS_ARE_NOT_IN_TOKENS: true,
  ALL_SESSIONS_ARE_REVOCABLE: true,
  ZERO_TRUST_CLIENT: true,
  DEVICE_AWARE_SECURITY: true,
  AUDIT_ALWAYS_ON: true,
} as const;
