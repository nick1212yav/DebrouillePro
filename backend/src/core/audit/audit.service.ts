/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE CORE — AUDIT SERVICE (WORLD #1 FINAL)                          */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/audit/audit.service.ts                             */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Orchestrer l’enregistrement des événements d’audit                     */
/*   - Fournir recherche, filtrage et agrégations                              */
/*   - Garantir traçabilité et gouvernance                                    */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { randomUUID } from "crypto";

import {
  AuditEvent,
  AuditActor,
  AuditTarget,
  AuditContext,
  AuditDomain,
  AuditSeverity,
  AuditQuery,
  AuditMetrics,
  nowISO,
  defaultSeverityForDomain,
} from "./audit.types";

import {
  AuditLogModel,
  AuditLogDocument,
} from "./auditLog.model";

/* -------------------------------------------------------------------------- */
/* TYPES INTERNES                                                             */
/* -------------------------------------------------------------------------- */

export type CreateAuditEventInput<
  TPayload = unknown
> = {
  domain: AuditDomain;
  action: string;

  severity?: AuditSeverity;

  actor: AuditActor;
  target?: AuditTarget;

  payload?: TPayload;
  context?: AuditContext;

  occurredAt?: string;
};

export type AuditSearchResult = {
  total: number;
  items: ReadonlyArray<AuditEvent>;
};

/* -------------------------------------------------------------------------- */
/* INTERNAL UTILS                                                             */
/* -------------------------------------------------------------------------- */

const normalizeLimit = (limit?: number) =>
  Math.min(Math.max(limit ?? 50, 1), 500);

const normalizeOffset = (offset?: number) =>
  Math.max(offset ?? 0, 0);

/**
 * Construire une requête Mongo sécurisée depuis un filtre d’audit.
 */
const buildMongoQuery = (
  query: AuditQuery
): Record<string, unknown> => {
  const mongo: Record<string, unknown> = {};

  if (query.domain) {
    mongo.domain = query.domain;
  }

  if (query.severity) {
    mongo.severity = query.severity;
  }

  if (query.actorId) {
    mongo["actor.id"] = query.actorId;
  }

  if (query.targetId) {
    mongo["target.id"] = query.targetId;
  }

  if (query.fromDate || query.toDate) {
    mongo.occurredAt = {
      ...(query.fromDate
        ? { $gte: query.fromDate }
        : {}),
      ...(query.toDate
        ? { $lte: query.toDate }
        : {}),
    };
  }

  if (query.text) {
    mongo.$or = [
      { action: { $regex: query.text, $options: "i" } },
      { "actor.label": { $regex: query.text, $options: "i" } },
      { "target.label": { $regex: query.text, $options: "i" } },
    ];
  }

  return mongo;
};

/* -------------------------------------------------------------------------- */
/* AUDIT SERVICE                                                             */
/* -------------------------------------------------------------------------- */

export class AuditService {
  /* ====================================================================== */
  /* WRITE                                                                  */
  /* ====================================================================== */

  /**
   * Enregistrer un événement d’audit immuable.
   */
  static async record<TPayload>(
    input: CreateAuditEventInput<TPayload>
  ): Promise<AuditEvent<TPayload>> {
    const now = nowISO();

    const event: AuditEvent<TPayload> = {
      id: randomUUID(),
      domain: input.domain,
      action: input.action,
      severity:
        input.severity ??
        defaultSeverityForDomain(input.domain),

      actor: input.actor,
      target: input.target,
      payload: input.payload,
      context: input.context,

      occurredAt: input.occurredAt ?? now,
      recordedAt: now,
    };

    await AuditLogModel.create(event);

    return event;
  }

  /* ====================================================================== */
  /* BULK WRITE                                                             */
  /* ====================================================================== */

  /**
   * Enregistrer plusieurs événements en une seule opération.
   */
  static async recordBatch<TPayload>(
    events: ReadonlyArray<
      CreateAuditEventInput<TPayload>
    >
  ): Promise<number> {
    if (events.length === 0) return 0;

    const now = nowISO();

    const documents = events.map((e) => ({
      id: randomUUID(),
      domain: e.domain,
      action: e.action,
      severity:
        e.severity ??
        defaultSeverityForDomain(e.domain),
      actor: e.actor,
      target: e.target,
      payload: e.payload,
      context: e.context,
      occurredAt: e.occurredAt ?? now,
      recordedAt: now,
    }));

    const result = await AuditLogModel.insertMany(
      documents,
      { ordered: false }
    );

    return result.length;
  }

  /* ====================================================================== */
  /* READ                                                                   */
  /* ====================================================================== */

  /**
   * Recherche avancée dans les logs d’audit.
   */
  static async search(
    query: AuditQuery
  ): Promise<AuditSearchResult> {
    const mongoQuery = buildMongoQuery(query);

    const limit = normalizeLimit(query.limit);
    const offset = normalizeOffset(query.offset);

    const [total, items] = await Promise.all([
      AuditLogModel.countDocuments(mongoQuery),
      AuditLogModel.find(mongoQuery)
        .sort({ occurredAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean<AuditLogDocument[]>(),
    ]);

    return {
      total,
      items,
    };
  }

  /**
   * Récupérer un événement par son ID.
   */
  static async getById(
    id: string
  ): Promise<AuditEvent | null> {
    return AuditLogModel.findOne({ id })
      .lean<AuditLogDocument | null>();
  }

  /* ====================================================================== */
  /* METRICS                                                                */
  /* ====================================================================== */

  /**
   * Statistiques globales d’audit.
   */
  static async getMetrics(
    query?: Pick<
      AuditQuery,
      "fromDate" | "toDate"
    >
  ): Promise<AuditMetrics> {
    const match: Record<string, unknown> = {};

    if (query?.fromDate || query?.toDate) {
      match.occurredAt = {
        ...(query.fromDate
          ? { $gte: query.fromDate }
          : {}),
        ...(query.toDate
          ? { $lte: query.toDate }
          : {}),
      };
    }

    const pipeline = [
      { $match: match },
      {
        $facet: {
          total: [{ $count: "count" }],
          byDomain: [
            {
              $group: {
                _id: "$domain",
                count: { $sum: 1 },
              },
            },
          ],
          bySeverity: [
            {
              $group: {
                _id: "$severity",
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ];

    const [result] =
      await AuditLogModel.aggregate(pipeline);

    const total =
      result?.total?.[0]?.count ?? 0;

    const byDomain: AuditMetrics["byDomain"] =
      {};
    const bySeverity: AuditMetrics["bySeverity"] =
      {};

    for (const row of result?.byDomain ?? []) {
      byDomain[row._id] = row.count;
    }

    for (const row of result?.bySeverity ??
      []) {
      bySeverity[row._id] = row.count;
    }

    return {
      totalEvents: total,
      byDomain,
      bySeverity,
    };
  }

  /* ====================================================================== */
  /* HOUSEKEEPING                                                           */
  /* ====================================================================== */

  /**
   * Suppression contrôlée des anciens logs (politique de rétention).
   * ⚠️ À utiliser uniquement par jobs internes.
   */
  static async purgeBefore(
    isoDate: string
  ): Promise<number> {
    const result =
      await AuditLogModel.deleteMany({
        occurredAt: { $lt: isoDate },
      });

    return result.deletedCount ?? 0;
  }
}
