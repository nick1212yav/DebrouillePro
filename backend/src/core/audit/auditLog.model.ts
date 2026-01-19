/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE CORE — AUDIT LOG MODEL (WORLD #1 FINAL)                        */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/audit/auditLog.model.ts                            */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Persister les événements d’audit de manière immuable                   */
/*   - Garantir traçabilité, conformité, forensic                             */
/*   - Optimiser recherche, agrégation, archivage                             */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import mongoose, {
  Schema,
  Document,
  Model,
} from "mongoose";

import {
  AuditEvent,
  AuditActor,
  AuditTarget,
  AuditContext,
} from "./audit.types";

/* -------------------------------------------------------------------------- */
/* DOCUMENT INTERFACE                                                         */
/* -------------------------------------------------------------------------- */

export interface AuditLogDocument
  extends AuditEvent,
    Document {}

/* -------------------------------------------------------------------------- */
/* SUB-SCHEMAS                                                                */
/* -------------------------------------------------------------------------- */

const AuditActorSchema = new Schema<AuditActor>(
  {
    id: { type: String, index: true },
    type: {
      type: String,
      required: true,
      index: true,
    },
    label: { type: String },
    ip: { type: String, index: true },
    userAgent: { type: String },
  },
  { _id: false }
);

const AuditTargetSchema = new Schema<AuditTarget>(
  {
    id: { type: String, index: true },
    type: {
      type: String,
      required: true,
      index: true,
    },
    label: { type: String },
  },
  { _id: false }
);

const AuditContextSchema = new Schema<AuditContext>(
  {
    requestId: { type: String, index: true },
    traceId: { type: String, index: true },
    sessionId: { type: String, index: true },
    correlationId: { type: String, index: true },

    locale: { type: String },
    device: { type: String },

    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  { _id: false }
);

/* -------------------------------------------------------------------------- */
/* AUDIT LOG SCHEMA                                                           */
/* -------------------------------------------------------------------------- */

const AuditLogSchema = new Schema<AuditLogDocument>(
  {
    id: {
      type: String,
      required: true,
      index: true,
      unique: true,
    },

    domain: {
      type: String,
      required: true,
      index: true,
    },

    action: {
      type: String,
      required: true,
      index: true,
    },

    severity: {
      type: String,
      required: true,
      index: true,
    },

    actor: {
      type: AuditActorSchema,
      required: true,
    },

    target: {
      type: AuditTargetSchema,
      required: false,
    },

    payload: {
      type: Schema.Types.Mixed,
    },

    context: {
      type: AuditContextSchema,
    },

    occurredAt: {
      type: String,
      required: true,
      index: true,
    },

    recordedAt: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    collection: "audit_logs",
    versionKey: false,
    strict: true,
    minimize: false,
  }
);

/* -------------------------------------------------------------------------- */
/* IMMUTABILITY GUARD                                                         */
/* -------------------------------------------------------------------------- */
/**
 * Empêche toute modification après insertion.
 */
AuditLogSchema.pre("save", function (next) {
  if (!this.isNew) {
    return next(
      new Error(
        "Audit logs are immutable and cannot be modified."
      )
    );
  }
  next();
});

/* -------------------------------------------------------------------------- */
/* INDEXES STRATÉGIQUES                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Recherche temporelle rapide.
 */
AuditLogSchema.index({
  occurredAt: -1,
});

/**
 * Recherche par acteur.
 */
AuditLogSchema.index({
  "actor.id": 1,
  occurredAt: -1,
});

/**
 * Recherche par cible.
 */
AuditLogSchema.index({
  "target.id": 1,
  occurredAt: -1,
});

/**
 * Recherche analytique domaine / sévérité.
 */
AuditLogSchema.index({
  domain: 1,
  severity: 1,
  occurredAt: -1,
});

/**
 * Recherche corrélée (tracing).
 */
AuditLogSchema.index({
  "context.correlationId": 1,
  occurredAt: -1,
});

/* -------------------------------------------------------------------------- */
/* MODEL EXPORT                                                               */
/* -------------------------------------------------------------------------- */

export const AuditLogModel: Model<AuditLogDocument> =
  mongoose.models.AuditLog ??
  mongoose.model<AuditLogDocument>(
    "AuditLog",
    AuditLogSchema
  );
