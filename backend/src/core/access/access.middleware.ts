/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE ACCESS — ACCESS MIDDLEWARE (WORLD #1 FINAL)                    */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/access/access.middleware.ts                        */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE STRATÉGIQUE :                                                        */
/*   - Faire respecter les décisions du moteur d’accès                        */
/*   - Ne contenir AUCUNE logique métier                                       */
/*   - Garantir cohérence, auditabilité et sécurité                            */
/*                                                                            */
/*  GARANTIES :                                                               */
/*   - Fail-safe (deny par défaut)                                             */
/*   - Aucune dépendance métier                                                */
/*   - Observabilité native                                                   */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Request, Response, NextFunction } from "express";

import { AccessEngine } from "./access.engine";
import {
  AccessDecision,
  AccessRequest,
  AccessResult,
} from "./access.types";

import {
  ModuleName,
  ModuleAction,
  IdentityContext,
} from "../identity/identity.types";

import { logger } from "../../shared/logger";

/* -------------------------------------------------------------------------- */
/* EXPRESS AUGMENTATION (SAFE & CANONICAL)                                    */
/* -------------------------------------------------------------------------- */

declare global {
  namespace Express {
    interface Request {
      /**
       * Résultat officiel de la décision d’accès.
       * Toujours injecté après évaluation.
       */
      access?: AccessResult;

      /**
       * Identité serveur résolue.
       * Injectée par auth.middleware.
       */
      identity?: IdentityContext;
    }
  }
}

/* -------------------------------------------------------------------------- */
/* INTERNAL UTILITIES                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Construire un AccessRequest strictement serveur.
 */
const buildAccessRequest = (
  req: Request,
  module: ModuleName,
  action: ModuleAction
): AccessRequest => ({
  subject: {
    identityContext: req.identity as IdentityContext,
  },
  target: {
    module,
    action,
    resourceId:
      typeof req.params?.id === "string"
        ? req.params.id
        : undefined,
    context: {
      method: req.method,
      path: req.originalUrl,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    },
  },
});

/**
 * Réponse sécurisée standard en cas de refus.
 */
const denyResponse = (
  res: Response,
  result: AccessResult
) => {
  return res.status(403).json({
    success: false,
    decision: result.decision,
    reason:
      result.reason ??
      "Access denied by security policy",
    recommendations:
      result.recommendations ?? [],
  });
};

/* -------------------------------------------------------------------------- */
/* ACCESS GUARD FACTORY                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Factory de middleware d’accès.
 *
 * Usage :
 *   router.post(
 *     "/resource",
 *     accessGuard("pay", "create"),
 *     controller
 *   );
 */
export const accessGuard = (
  module: ModuleName,
  action: ModuleAction
) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const requestLogger = logger.withRequest(req);

    try {
      /* ------------------------------------------------------------------ */
      /* IDENTITY GUARD (HARD FAIL)                                          */
      /* ------------------------------------------------------------------ */

      if (!req.identity) {
        requestLogger.warn(
          "Access denied: missing identity context",
          {
            module,
            action,
          }
        );

        res.status(401).json({
          success: false,
          decision: AccessDecision.DENY,
          reason: "Missing identity context",
        });
        return;
      }

      /* ------------------------------------------------------------------ */
      /* BUILD ACCESS REQUEST                                               */
      /* ------------------------------------------------------------------ */

      const accessRequest = buildAccessRequest(
        req,
        module,
        action
      );

      /* ------------------------------------------------------------------ */
      /* EVALUATE ACCESS                                                    */
      /* ------------------------------------------------------------------ */

      const result =
        await AccessEngine.evaluate(
          accessRequest
        );

      /* ------------------------------------------------------------------ */
      /* INJECT RESULT INTO REQUEST                                         */
      /* ------------------------------------------------------------------ */

      req.access = result;

      /* ------------------------------------------------------------------ */
      /* OBSERVABILITY                                                      */
      /* ------------------------------------------------------------------ */

      requestLogger.info("Access evaluated", {
        module,
        action,
        decision: result.decision,
        reason: result.reason,
      });

      /* ------------------------------------------------------------------ */
      /* HANDLE DECISION                                                    */
      /* ------------------------------------------------------------------ */

      switch (result.decision) {
        case AccessDecision.ALLOW:
          next();
          return;

        case AccessDecision.LIMIT:
          /**
           * LIMIT autorise le passage mais expose
           * des contraintes (quota, champs, scope).
           * Le contrôleur doit les respecter.
           */
          next();
          return;

        case AccessDecision.RECOMMEND:
          /**
           * Action non autorisée mais recommandée
           * (ex: onboarding, vérification, upgrade).
           */
          denyResponse(res, result);
          return;

        case AccessDecision.DENY:
        default:
          denyResponse(res, result);
          return;
      }
    } catch (error) {
      /* ------------------------------------------------------------------ */
      /* FAIL SAFE                                                          */
      /* ------------------------------------------------------------------ */

      requestLogger.error(
        "Access evaluation failed",
        error
      );

      res.status(500).json({
        success: false,
        decision: AccessDecision.DENY,
        reason:
          "Access engine failure. Request denied by safety policy.",
      });
    }
  };
};

/* -------------------------------------------------------------------------- */
/* PHILOSOPHIE                                                                */
/* -------------------------------------------------------------------------- */
/**
 * ✅ Ce middleware :
 *  - Ne prend AUCUNE décision métier
 *  - Applique STRICTEMENT le moteur
 *  - Est audit-friendly
 *  - Est observable
 *  - Est testable indépendamment
 *
 * ❌ Toute logique métier doit rester dans les modules.
 *
 * 👉 Séparation totale des responsabilités.
 */
