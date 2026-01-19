/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE TRUST — TRUST LOG MODEL (IMMUTABLE LEDGER WORLD #1)             */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/trust/trustLog.model.ts                             */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Guarantees                                                                */
/*  - Append-only ledger                                                      */
/*  - Cryptographic chaining (SHA-256)                                        */
/*  - Zero physical deletion                                                  */
/*  - Mongoose v8 compatible                                                  */
/*  - TypeScript strict safe                                                  */
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

export enum TrustSource {
  SYSTEM = "SYSTEM",
  USER_ACTION = "USER_ACTION",
  ADMIN = "ADMIN",
  AI = "AI",
  EXTERNAL = "EXTERNAL",
}

export enum TrustImpactType {
  INCREASE = "INCREASE",
  DECREASE = "DECREASE",
  NEUTRAL = "NEUTRAL",
}

export enum TrustEventType {
  ACCOUNT_CREATED = "ACCOUNT_CREATED",
  IDENTITY_VERIFIED = "IDENTITY_VERIFIED",

  TRANSACTION_SUCCESS = "TRANSACTION_SUCCESS",
  TRANSACTION_FAILED = "TRANSACTION_FAILED",

  CONTENT_REPORTED = "CONTENT_REPORTED",
  CONTENT_VALIDATED = "CONTENT_VALIDATED",

  DELIVERY_COMPLETED = "DELIVERY_COMPLETED",
  DELIVERY_DISPUTED = "DELIVERY_DISPUTED",

  JOB_COMPLETED = "JOB_COMPLETED",
  JOB_DISPUTED = "JOB_DISPUTED",

  ADMIN_OVERRIDE = "ADMIN_OVERRIDE",
  AI_ADJUSTMENT = "AI_ADJUSTMENT",
}

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type TrustLedgerSignature = {
  algorithm: "SHA256";
  hash: string;
  previousHash?: string;
};

/* -------------------------------------------------------------------------- */
/* INTERFACE                                                                  */
/* -------------------------------------------------------------------------- */

export interface ITrustLog extends Document {
  _id: Types.ObjectId;

  identityKind: IdentityKind;
  userId?: Types.ObjectId;
  organizationId?: Types.ObjectId;

  eventType: TrustEventType;
  source: TrustSource;

  impactType: TrustImpactType;
  impactValue: number;

  previousTrustScore: number;
  newTrustScore: number;

  reason: string;
  metadata?: Record<string, unknown>;

  requestId?: string;
  traceId?: string;

  ledger: TrustLedgerSignature;

  createdAt: Date;
}

/* -------------------------------------------------------------------------- */
/* INTERNAL HELPERS                                                           */
/* -------------------------------------------------------------------------- */

const computeLedgerHash = (
  payload: Record<string, unknown>
): string => {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
};

/* -------------------------------------------------------------------------- */
/* SCHEMA                                                                     */
/* -------------------------------------------------------------------------- */

const TrustLogSchema = new Schema<ITrustLog>(
  {
    identityKind: {
      type: String,
      enum: Object.values(IdentityKind),
      required: true,
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

    eventType: {
      type: String,
      enum: Object.values(TrustEventType),
      required: true,
      index: true,
    },

    source: {
      type: String,
      enum: Object.values(TrustSource),
      required: true,
      index: true,
    },

    impactType: {
      type: String,
      enum: Object.values(TrustImpactType),
      required: true,
    },

    impactValue: {
      type: Number,
      required: true,
      min: 0,
    },

    previousTrustScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    newTrustScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
    },

    metadata: {
      type: Schema.Types.Mixed,
    },

    requestId: {
      type: String,
      index: true,
    },

    traceId: {
      type: String,
      index: true,
    },

    ledger: {
      algorithm: {
        type: String,
        enum: ["SHA256"],
        default: "SHA256",
      },
      hash: {
        type: String,
        required: true,
        index: true,
      },
      previousHash: {
        type: String,
        index: true,
      },
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

TrustLogSchema.index({
  identityKind: 1,
  userId: 1,
  organizationId: 1,
  createdAt: -1,
});

TrustLogSchema.index({ eventType: 1, source: 1 });
TrustLogSchema.index({ "ledger.hash": 1 }, { unique: true });
TrustLogSchema.index({ "ledger.previousHash": 1 });

/* -------------------------------------------------------------------------- */
/* LEDGER SEALING                                                             */
/* -------------------------------------------------------------------------- */

TrustLogSchema.pre(
  "validate",
  async function (
    this: ITrustLog,
    next: CallbackWithoutResultAndOptionalError
  ) {
    if (this.ledger?.hash) return next();

    const lastLog = await TrustLogModel.findOne({})
      .sort({ createdAt: -1 })
      .select("ledger.hash")
      .lean<{ ledger?: { hash?: string } }>();

    const previousHash = lastLog?.ledger?.hash;

    const payload = {
      identityKind: this.identityKind,
      userId: this.userId?.toString(),
      organizationId:
        this.organizationId?.toString(),
      eventType: this.eventType,
      source: this.source,
      impactType: this.impactType,
      impactValue: this.impactValue,
      previousTrustScore: this.previousTrustScore,
      newTrustScore: this.newTrustScore,
      reason: this.reason,
      metadata: this.metadata,
      requestId: this.requestId,
      traceId: this.traceId,
      createdAt: this.createdAt ?? new Date(),
      previousHash,
    };

    this.ledger = {
      algorithm: "SHA256",
      hash: computeLedgerHash(payload),
      previousHash,
    };

    next();
  }
);

/* -------------------------------------------------------------------------- */
/* IMMUTABILITY GUARANTEES                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Identity consistency rules.
 */
TrustLogSchema.pre(
  "save",
  function (
    this: ITrustLog,
    next: CallbackWithoutResultAndOptionalError
  ) {
    if (
      this.identityKind === IdentityKind.PERSON &&
      !this.userId
    ) {
      return next(
        new Error(
          "TrustLog PERSON must have userId"
        )
      );
    }

    if (
      this.identityKind ===
        IdentityKind.ORGANIZATION &&
      !this.organizationId
    ) {
      return next(
        new Error(
          "TrustLog ORGANIZATION must have organizationId"
        )
      );
    }

    if (!this.isNew) {
      return next(
        new Error(
          "TrustLog is immutable once created"
        )
      );
    }

    next();
  }
);

/**
 * Block all updates.
 */
TrustLogSchema.pre(
  ["updateOne", "updateMany", "findOneAndUpdate"],
  function (
    next: CallbackWithoutResultAndOptionalError
  ) {
    return next(
      new Error("TrustLog cannot be updated")
    );
  }
);

/**
 * Block all physical deletions.
 */
TrustLogSchema.pre(
  ["deleteOne", "deleteMany", "findOneAndDelete"],
  function (
    next: CallbackWithoutResultAndOptionalError
  ) {
    return next(
      new Error(
        "TrustLog cannot be physically deleted"
      )
    );
  }
);

/* -------------------------------------------------------------------------- */
/* FORENSIC HELPERS                                                           */
/* -------------------------------------------------------------------------- */

TrustLogSchema.statics.verifyLedgerIntegrity =
  async function (): Promise<boolean> {
    const logs: ITrustLog[] = await this.find({})
      .sort({ createdAt: 1 })
      .lean();

    let previousHash: string | undefined;

    for (const log of logs) {
      const payload = {
        identityKind: log.identityKind,
        userId: log.userId?.toString(),
        organizationId:
          log.organizationId?.toString(),
        eventType: log.eventType,
        source: log.source,
        impactType: log.impactType,
        impactValue: log.impactValue,
        previousTrustScore:
          log.previousTrustScore,
        newTrustScore: log.newTrustScore,
        reason: log.reason,
        metadata: log.metadata,
        requestId: log.requestId,
        traceId: log.traceId,
        createdAt: log.createdAt,
        previousHash,
      };

      const expectedHash =
        computeLedgerHash(payload);

      if (expectedHash !== log.ledger.hash) {
        return false;
      }

      if (log.ledger.previousHash !== previousHash) {
        return false;
      }

      previousHash = log.ledger.hash;
    }

    return true;
  };

/* -------------------------------------------------------------------------- */
/* EXPORT                                                                     */
/* -------------------------------------------------------------------------- */

export const TrustLogModel = model<ITrustLog>(
  "TrustLog",
  TrustLogSchema
);
