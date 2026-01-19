/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE AUTH — AUTH CONTROLLER (WORLD #1 FINAL)                        */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/auth/auth.controller.ts                            */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE STRATÉGIQUE :                                                        */
/*   - Exposer les endpoints d’authentification                               */
/*   - Orchestrer les flux sans contenir de logique métier                    */
/*   - Garantir sécurité, auditabilité et cohérence API                       */
/*                                                                            */
/*  GARANTIES :                                                               */
/*   - Aucune logique cryptographique ici                                     */
/*   - Aucune décision métier ici                                             */
/*   - Erreurs normalisées                                                    */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Request, Response } from "express";
import { Types } from "mongoose";

import { AuthService } from "./auth.service";
import {
  LoginInput,
  AuthErrorCode,
} from "./auth.types";

import {
  ok,
  error as httpError,
} from "../../shared/httpResponse";

import { logger } from "../../shared/logger";
import { IdentityKind } from "../identity/identity.types";

/* -------------------------------------------------------------------------- */
/* INTERNAL HELPERS                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Extraction stricte et typée de la payload login.
 * Aucun accès direct au body ailleurs dans le controller.
 */
const extractLoginInput = (req: Request): LoginInput => ({
  email:
    typeof req.body?.email === "string"
      ? req.body.email.trim()
      : undefined,

  phone:
    typeof req.body?.phone === "string"
      ? req.body.phone.trim()
      : undefined,

  password:
    typeof req.body?.password === "string"
      ? req.body.password
      : undefined,

  otp:
    typeof req.body?.otp === "string"
      ? req.body.otp
      : undefined,

  deviceId:
    typeof req.body?.deviceId === "string"
      ? req.body.deviceId
      : undefined,

  deviceName:
    typeof req.body?.deviceName === "string"
      ? req.body.deviceName
      : undefined,
});

/**
 * Récupération safe du requestId injecté par requestContextMiddleware.
 */
const getRequestId = (req: Request): string | undefined =>
  (req as any)?.context?.meta?.requestId;

/* -------------------------------------------------------------------------- */
/* CONTROLLER                                                                 */
/* -------------------------------------------------------------------------- */

export class AuthController {
  /* ====================================================================== */
  /* LOGIN                                                                  */
  /* ====================================================================== */

  static async login(
    req: Request,
    res: Response
  ): Promise<Response> {
    const requestId = getRequestId(req);

    try {
      const input = extractLoginInput(req);

      const result =
        await AuthService.loginWithPassword(
          input
        );

      logger.withRequest(req).info(
        "AUTH_LOGIN_SUCCESS",
        {
          sessionId: result.sessionId,
          deviceId: input.deviceId,
        }
      );

      return ok(res, result, {
        requestId,
      });
    } catch (err: any) {
      logger.withRequest(req).warn(
        "AUTH_LOGIN_FAILED",
        {
          reason: err?.message,
          email: req.body?.email,
          phone: req.body?.phone,
        }
      );

      return httpError(res, {
        statusCode: 401,
        code:
          err?.code ??
          AuthErrorCode.INVALID_CREDENTIALS,
        message: "Authentication failed",
        requestId,
      });
    }
  }

  /* ====================================================================== */
  /* REFRESH                                                                */
  /* ====================================================================== */

  static async refresh(
    req: Request,
    res: Response
  ): Promise<Response> {
    const requestId = getRequestId(req);

    try {
      const refreshToken =
        typeof req.body?.refreshToken ===
        "string"
          ? req.body.refreshToken
          : undefined;

      if (!refreshToken) {
        return httpError(res, {
          statusCode: 400,
          code: AuthErrorCode.TOKEN_INVALID,
          message: "Refresh token required",
          requestId,
        });
      }

      const result =
        await AuthService.refreshSession(
          refreshToken
        );

      logger.withRequest(req).info(
        "AUTH_REFRESH_SUCCESS",
        {
          sessionId: result.sessionId,
        }
      );

      return ok(res, result, {
        requestId,
      });
    } catch (err: any) {
      logger.withRequest(req).warn(
        "AUTH_REFRESH_FAILED",
        {
          reason: err?.message,
        }
      );

      return httpError(res, {
        statusCode: 401,
        code:
          err?.code ??
          AuthErrorCode.TOKEN_EXPIRED,
        message: "Session refresh failed",
        requestId,
      });
    }
  }

  /* ====================================================================== */
  /* LOGOUT                                                                 */
  /* ====================================================================== */

  static async logout(
    req: Request,
    res: Response
  ): Promise<Response> {
    const requestId = getRequestId(req);

    try {
      const sessionId =
        req.identity?.sessionId;

      if (!sessionId) {
        return httpError(res, {
          statusCode: 401,
          code: AuthErrorCode.UNAUTHORIZED,
          message: "No active session",
          requestId,
        });
      }

      await AuthService.revokeSession(
        new Types.ObjectId(sessionId)
      );

      logger.withRequest(req).info(
        "AUTH_LOGOUT_SUCCESS",
        {
          sessionId,
        }
      );

      return ok(
        res,
        { message: "Logout successful" },
        { requestId }
      );
    } catch (err: any) {
      logger.withRequest(req).error(
        "AUTH_LOGOUT_FAILED",
        err
      );

      return httpError(res, {
        statusCode: 500,
        code: "LOGOUT_FAILED",
        message: "Unable to logout",
        requestId,
      });
    }
  }

  /* ====================================================================== */
  /* LOGOUT ALL                                                             */
  /* ====================================================================== */

  static async logoutAll(
    req: Request,
    res: Response
  ): Promise<Response> {
    const requestId = getRequestId(req);

    try {
      const identity = req.identity?.identity;

      if (
        !identity ||
        identity.kind !== IdentityKind.PERSON
      ) {
        return httpError(res, {
          statusCode: 401,
          code: AuthErrorCode.UNAUTHORIZED,
          message: "Unauthorized",
          requestId,
        });
      }

      await AuthService.revokeAllSessionsForUser(
        identity.userId
      );

      logger.withRequest(req).info(
        "AUTH_LOGOUT_ALL_SUCCESS",
        {
          userId: identity.userId,
        }
      );

      return ok(
        res,
        { message: "All sessions revoked" },
        { requestId }
      );
    } catch (err: any) {
      logger.withRequest(req).error(
        "AUTH_LOGOUT_ALL_FAILED",
        err
      );

      return httpError(res, {
        statusCode: 500,
        code: "LOGOUT_ALL_FAILED",
        message:
          "Unable to revoke all sessions",
        requestId,
      });
    }
  }
}
