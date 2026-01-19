/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE TRACKING — AUDIT LOG MODEL (FORENSIC GRADE)                     */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/tracking/auditLog.model.ts                          */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Guarantees                                                                */
/*  - Immutable ledger (append-only)                                          */
/*  - Cryptographic chaining (anti-tamper)                                    */
/*  - Zero physical deletion                                                  */
/*  - Audit / legal ready                                                     */
/*  - Mongoose v8 compatible                                                  */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  Schema,
  model,
  Document,
  Types,
  CallbackWithoutResultAndOptionalError,
} from "mongoose";
import crypto from "crypto";
import { IdentityKind } from "../identity/identity.types";

/* -------------------------------------------------------------------------- */
/* ENUMS                                                                      */
/* -------------------------------------------------------------------------- */

export enum AuditCategory {
  AUTH = "AUTH",
  ACCESS = "ACCESS",
  TRUST = "TRUST",
  PAY = "PAY",
  DOC = "DOC",
  PROFILE = "PROFILE",
  NOTIFICATION = "NOTIFICATION",
  SEARCH = "SEARCH",
  TRACKING = "TRACKING",
  ADMIN = "ADMIN",
  SYSTEM = "SYSTEM",
  SECURITY = "SECURITY",
}

export enum AuditSeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export enum AuditOutcome {
  SUCCESS = "SUCCESS",
  FAILURE = "FAILURE",
  DENIED = "DENIED",
  TIMEOUT = "TIMEOUT",
  PARTIAL = "PARTIAL",
}

export enum AuditSource {
  API = "API",
  WORKER = "WORKER",
  CRON = "CRON",
  SYSTEM = "SYSTEM",
  EXTERNAL = "EXTERNAL",
  AI = "AI",
}

/* -------------------------------------------------------------------------- */
/* INTERFACE                                                                  */
/* -------------------------------------------------------------------------- */

export interface IAuditLog extends Document {
  _id: Types.ObjectId;

  /* Actor */
  identityKind?: IdentityKind;
  userId?: Types.ObjectId;
  organizationId?: Types.ObjectId;

  /* Action */
  category: AuditCategory;
  action: string;
  outcome: AuditOutcome;
  source: AuditSource;

  /* Target */
  targetType?: string;
  targetId?: Types.ObjectId;

  /* Context */
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  sessionId?: string;
  geoLocation?: {
    country?: string;
    city?: string;
    lat?: number;
    lng?: number;
  };

  /* Payload */
  message?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;

  /* Integrity */
  hash: string;
  previousHash?: string;

  /* Severity */
  severity: AuditSeverity;

  /* Compliance */
  retentionUntil?: Date;

  /* Audit */
  createdAt: Date;
}

/* -------------------------------------------------------------------------- */
/* SCHEMA                                                                     */
/* -------------------------------------------------------------------------- */

const AuditLogSchema = new Schema<IAuditLog>(
  {
    identityKind: {
      type: String,
      enum: Object.values(IdentityKind),
      index: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
    },

    category: {
      type: String,
      enum: Object.values(AuditCategory),
      required: true,
      index: true,
    },

    action: {
      type: String,
      required: true,
      index: true,
      maxlength: 200,
    },

    outcome: {
      type: String,
      enum: Object.values(AuditOutcome),
      required: true,
      index: true,
    },

    source: {
      type: String,
      enum: Object.values(AuditSource),
      default: AuditSource.API,
      index: true,
    },

    targetType: {
      type: String,
      index: true,
      maxlength: 120,
    },

    targetId: {
      type: Schema.Types.ObjectId,
      index: true,
    },

    ipAddress: {
      type: String,
      index: true,
    },

    userAgent: String,

    requestId: {
      type: String,
      index: true,
    },

    sessionId: {
      type: String,
      index: true,
    },

    geoLocation: {
      country: String,
      city: String,
      lat: Number,
      lng: Number,
    },

    message: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    before: Schema.Types.Mixed,
    after: Schema.Types.Mixed,
    metadata: Schema.Types.Mixed,

    hash: {
      type: String,
      required: true,
      immutable: true,
      index: true,
    },

    previousHash: {
      type: String,
      index: true,
    },

    severity: {
      type: String,
      enum: Object.values(AuditSeverity),
      default: AuditSeverity.LOW,
      index: true,
    },

    retentionUntil: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
    strict: true,
  }
);

/* -------------------------------------------------------------------------- */
/* INDEXES                                                                    */
/* -------------------------------------------------------------------------- */

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({
  category: 1,
  severity: 1,
  createdAt: -1,
});
AuditLogSchema.index({ userId: 1, createdAt: -1 });
AuditLogSchema.index({
  organizationId: 1,
  createdAt: -1,
});
AuditLogSchema.index({ targetType: 1, targetId: 1 });
AuditLogSchema.index({ hash: 1 }, { unique: true });

/* -------------------------------------------------------------------------- */
/* INTEGRITY ENGINE                                                           */
/* -------------------------------------------------------------------------- */

const computeHash = (payload: object): string => {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
};

/* -------------------------------------------------------------------------- */
/* IMMUTABILITY & SECURITY RULES                                              */
/* -------------------------------------------------------------------------- */

/**
 * Seal and chain the log before validation.
 */
AuditLogSchema.pre(
  "validate",
  async function (
    this: IAuditLog,
    next: CallbackWithoutResultAndOptionalError
  ) {
    if (this.hash) return next();

    const lastLog = await AuditLogModel.findOne({})
      .sort({ createdAt: -1 })
      .select("hash")
      .lean<{ hash?: string }>();

    this.previousHash = lastLog?.hash;

    const payload = {
      identityKind: this.identityKind,
      userId: this.userId?.toString(),
      organizationId: this.organizationId?.toString(),
      category: this.category,
      action: this.action,
      outcome: this.outcome,
      source: this.source,
      targetType: this.targetType,
      targetId: this.targetId?.toString(),
      ipAddress: this.ipAddress,
      message: this.message,
      before: this.before,
      after: this.after,
      metadata: this.metadata,
      severity: this.severity,
      previousHash: this.previousHash,
      createdAt: this.createdAt ?? new Date(),
    };

    this.hash = computeHash(payload);

    next();
  }
);

/**
 * Prevent any modification once persisted.
 */
AuditLogSchema.pre(
  "save",
  function (
    this: IAuditLog,
    next: CallbackWithoutResultAndOptionalError
  ) {
    if (!this.isNew) {
      return next(
        new Error(
          "AuditLog is immutable once created"
        )
      );
    }
    next();
  }
);

/**
 * Prevent updates via updateOne / findOneAndUpdate / updateMany.
 */
AuditLogSchema.pre(
  ["updateOne", "updateMany", "findOneAndUpdate"],
  function (
    next: CallbackWithoutResultAndOptionalError
  ) {
    return next(
      new Error(
        "AuditLog cannot be updated (immutable ledger)"
      )
    );
  }
);

/**
 * Prevent physical deletion (deleteOne / deleteMany / findOneAndDelete).
 */
AuditLogSchema.pre(
  ["deleteOne", "deleteMany", "findOneAndDelete"],
  function (
    next: CallbackWithoutResultAndOptionalError
  ) {
    return next(
      new Error(
        "Physical deletion of audit logs is forbidden"
      )
    );
  }
);

/* -------------------------------------------------------------------------- */
/* EXPORT                                                                     */
/* -------------------------------------------------------------------------- */

export const AuditLogModel = model<IAuditLog>(
  "AuditLog",
  AuditLogSchema
);
