/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE TRACKING — TRACKING CONTROLLER (ULTRA FINAL)                    */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/tracking/tracking.controller.ts                    */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Exposer une API sécurisée pour l’observation système                    */
/*   - Permettre audit, forensic, IA, monitoring                              */
/*   - Supporter filtrage massif, export, agrégation                           */
/*                                                                            */
/*  SÉCURITÉ :                                                                */
/*   - Accès restreint (ADMIN / AUDITOR / SYSTEM)                              */
/*   - Pagination obligatoire                                                 */
/*   - Champs sensibles filtrés                                               */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Request, Response } from "express";
import { Types } from "mongoose";

import {
  AuditLogModel,
  AuditCategory,
  AuditSeverity,
  AuditOutcome,
} from "./auditLog.model";

import { TrackingService } from "./tracking.service";

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

const parseObjectId = (value?: string) => {
  if (!value) return undefined;
  if (!Types.ObjectId.isValid(value)) return undefined;
  return new Types.ObjectId(value);
};

const parseDate = (value?: string) => {
  if (!value) return undefined;
  const date = new Date(value);
  return isNaN(date.getTime()) ? undefined : date;
};

const sanitizeLimit = (value?: string) => {
  const limit = Number(value || 50);
  return Math.min(Math.max(limit, 1), 200);
};

/* -------------------------------------------------------------------------- */
/* CONTROLLER                                                                 */
/* -------------------------------------------------------------------------- */

export class TrackingController {
  /* ======================================================================== */
  /* SEARCH LOGS                                                              */
  /* ======================================================================== */

  /**
   * GET /tracking/logs
   * Recherche avancée avec filtres dynamiques.
   */
  static async search(
    req: Request,
    res: Response
  ) {
    const {
      category,
      severity,
      outcome,
      userId,
      organizationId,
      targetType,
      from,
      to,
      limit,
    } = req.query as Record<string, string>;

    const query: any = {};

    if (category) query.category = category;
    if (severity) query.severity = severity;
    if (outcome) query.outcome = outcome;
    if (targetType) query.targetType = targetType;

    const parsedUserId = parseObjectId(userId);
    if (parsedUserId) query.userId = parsedUserId;

    const parsedOrgId = parseObjectId(organizationId);
    if (parsedOrgId) query.organizationId = parsedOrgId;

    const fromDate = parseDate(from);
    const toDate = parseDate(to);

    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = fromDate;
      if (toDate) query.createdAt.$lte = toDate;
    }

    const logs = await AuditLogModel.find(query)
      .sort({ createdAt: -1 })
      .limit(sanitizeLimit(limit))
      .lean()
      .exec();

    res.json({
      count: logs.length,
      logs,
    });
  }

  /* ======================================================================== */
  /* AGGREGATIONS                                                             */
  /* ======================================================================== */

  /**
   * GET /tracking/stats
   * Statistiques agrégées globales.
   */
  static async stats(
    _req: Request,
    res: Response
  ) {
    const [byCategory, bySeverity, byOutcome] =
      await Promise.all([
        AuditLogModel.aggregate([
          { $group: { _id: "$category", count: { $sum: 1 } } },
        ]),
        AuditLogModel.aggregate([
          { $group: { _id: "$severity", count: { $sum: 1 } } },
        ]),
        AuditLogModel.aggregate([
          { $group: { _id: "$outcome", count: { $sum: 1 } } },
        ]),
      ]);

    res.json({
      byCategory,
      bySeverity,
      byOutcome,
      generatedAt: new Date(),
    });
  }

  /* ======================================================================== */
  /* FORENSIC EXPORT                                                          */
  /* ======================================================================== */

  /**
   * GET /tracking/export
   * Export massif pour audit légal.
   */
  static async export(
    req: Request,
    res: Response
  ) {
    const fromDate = parseDate(req.query.from as string);
    const toDate = parseDate(req.query.to as string);

    const query: any = {};
    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = fromDate;
      if (toDate) query.createdAt.$lte = toDate;
    }

    const cursor = AuditLogModel.find(query)
      .sort({ createdAt: -1 })
      .cursor();

    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=audit-export.json"
    );

    res.write("[");

    let first = true;

    for await (const doc of cursor) {
      if (!first) res.write(",");
      first = false;
      res.write(JSON.stringify(doc));
    }

    res.write("]");
    res.end();
  }

  /* ======================================================================== */
  /* SYSTEM EVENT (INTERNAL)                                                  */
  /* ======================================================================== */

  /**
   * POST /tracking/system-event
   * Injection contrôlée d'événements système.
   */
  static async systemEvent(
    req: Request,
    res: Response
  ) {
    const {
      action,
      outcome,
      severity,
      message,
      metadata,
    } = req.body;

    const log = await TrackingService.system(
      {
        requestId: req.headers["x-request-id"] as string,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      },
      {
        action,
        outcome,
        severity,
        message,
        metadata,
      }
    );

    res.status(201).json(log);
  }
}
