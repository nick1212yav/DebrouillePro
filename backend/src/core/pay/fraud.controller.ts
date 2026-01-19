/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE PAY — FRAUD CONTROLLER (GLOBAL SUPERVISION API)                 */
/*  File: backend/src/core/pay/fraud.controller.ts                            */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  MISSION :                                                                 */
/*  - Exposer les signaux antifraude                                           */
/*  - Fournir des recommandations explicables                                 */
/*  - Permettre supervision humaine                                           */
/*  - Alimenter IA, dashboards, modules                                       */
/*  - Supporter audit & traçabilité légale                                     */
/*                                                                            */
/*  GARANTIES :                                                               */
/*  - Lecture seule par défaut                                                 */
/*  - Aucune mutation directe des fonds                                       */
/*  - Sécurisé par AccessEngine                                               */
/*  - Observabilité by design                                                  */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Request, Response } from "express";

import { AccessEngine } from "../access/access.engine";
import { IdentityKind } from "../identity/identity.types";

import {
  FraudLearningEngine,
} from "./fraud.learning.engine";

import {
  TrackingService,
} from "../tracking/tracking.service";

import {
  AuditCategory,
  AuditOutcome,
} from "../tracking/auditLog.model";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type FraudQuery = {
  identityId: string;
};

/* -------------------------------------------------------------------------- */
/* CONTROLLER                                                                 */
/* -------------------------------------------------------------------------- */

export class FraudController {
  /* ======================================================================== */
  /* GET /fraud/analyze                                                       */
  /* ======================================================================== */

  /**
   * Analyse instantanée d’une identité.
   */
  static async analyze(
    req: Request,
    res: Response
  ) {
    const { identityId } =
      req.query as unknown as FraudQuery;

    /* -------------------------------------------------------------------- */
    /* ACCESS CONTROL                                                       */
    /* -------------------------------------------------------------------- */

    await AccessEngine.assert({
      actor: req.context.identity,
      action: "FRAUD_ANALYZE",
      resource: {
        kind: "IDENTITY",
        id: identityId,
      },
    });

    /* -------------------------------------------------------------------- */
    /* ANALYZE                                                              */
    /* -------------------------------------------------------------------- */

    const signals =
      FraudLearningEngine.analyze(identityId);

    const recommendation =
      FraudLearningEngine.recommend(identityId);

    /* -------------------------------------------------------------------- */
    /* TRACKING                                                             */
    /* -------------------------------------------------------------------- */

    await TrackingService.track(req.context.tracking, {
      category: AuditCategory.SECURITY,
      action: "fraud.analyze",
      outcome: AuditOutcome.SUCCESS,
      targetType: "IDENTITY",
      targetId: identityId as any,
      metadata: {
        signalsCount: signals.length,
        hasRecommendation: !!recommendation,
      },
    });

    /* -------------------------------------------------------------------- */
    /* RESPONSE                                                             */
    /* -------------------------------------------------------------------- */

    return res.json({
      identityId,
      signals,
      recommendation,
      analyzedAt: new Date(),
    });
  }

  /* ======================================================================== */
  /* POST /fraud/observe                                                      */
  /* ======================================================================== */

  /**
   * Injection d’un événement d’observation.
   * Utilisé par pay, auth, access, mobile, edge.
   */
  static async observe(
    req: Request,
    res: Response
  ) {
    const observation = req.body;

    /* -------------------------------------------------------------------- */
    /* ACCESS CONTROL                                                       */
    /* -------------------------------------------------------------------- */

    await AccessEngine.assert({
      actor: req.context.identity,
      action: "FRAUD_OBSERVE",
      resource: {
        kind: "SYSTEM",
        id: "fraud-engine",
      },
    });

    /* -------------------------------------------------------------------- */
    /* INGESTION                                                            */
    /* -------------------------------------------------------------------- */

    FraudLearningEngine.observe({
      ...observation,
      timestamp: new Date(
        observation.timestamp || Date.now()
      ),
    });

    /* -------------------------------------------------------------------- */
    /* TRACKING                                                             */
    /* -------------------------------------------------------------------- */

    await TrackingService.track(req.context.tracking, {
      category: AuditCategory.SECURITY,
      action: "fraud.observe",
      outcome: AuditOutcome.SUCCESS,
      metadata: {
        identityId: observation.identityId,
        source: observation.source,
      },
    });

    return res.status(202).json({
      accepted: true,
    });
  }

  /* ======================================================================== */
  /* GET /fraud/recommendation                                                */
  /* ======================================================================== */

  /**
   * Obtenir uniquement la recommandation consolidée.
   */
  static async recommendation(
    req: Request,
    res: Response
  ) {
    const { identityId } =
      req.query as unknown as FraudQuery;

    /* -------------------------------------------------------------------- */
    /* ACCESS CONTROL                                                       */
    /* -------------------------------------------------------------------- */

    await AccessEngine.assert({
      actor: req.context.identity,
      action: "FRAUD_READ",
      resource: {
        kind: "IDENTITY",
        id: identityId,
      },
    });

    const recommendation =
      FraudLearningEngine.recommend(identityId);

    await TrackingService.track(req.context.tracking, {
      category: AuditCategory.SECURITY,
      action: "fraud.recommendation",
      outcome: AuditOutcome.SUCCESS,
      targetType: "IDENTITY",
      targetId: identityId as any,
      metadata: {
        exists: !!recommendation,
      },
    });

    return res.json({
      identityId,
      recommendation,
      generatedAt: new Date(),
    });
  }

  /* ======================================================================== */
  /* GET /fraud/health                                                        */
  /* ======================================================================== */

  /**
   * Health check du moteur antifraude.
   */
  static async health(
    _req: Request,
    res: Response
  ) {
    return res.json({
      service: "fraud-engine",
      status: "healthy",
      time: new Date(),
    });
  }
}
