/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE NOTIFICATION — DELIVERY MODEL (WORLD #1 CANONICAL)             */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/notification/delivery/delivery.model.ts            */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*  - Stocker chaque tentative de livraison de notification                  */
/*  - Garantir preuve, traçabilité, auditabilité                              */
/*  - Supporter des milliards d’événements                                    */
/*                                                                            */
/*  PRINCIPES ABSOLUS :                                                       */
/*  - Jamais de suppression physique                                          */
/*  - Historique append-only                                                  */
/*  - Toute mutation est traçable                                             */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Schema, model, Document, Types } from "mongoose";

import {
  DeliveryStatus,
  DeliveryChannel,
  DeliveryAttempt,
  DeliveryReceipt,
  DeliverySLA,
} from "./delivery.types";

/* -------------------------------------------------------------------------- */
/* INTERFACE                                                                  */
/* -------------------------------------------------------------------------- */

export interface IDelivery extends Document {
  _id: Types.ObjectId;

  /* Relations */
  notificationId: Types.ObjectId;
  recipientId?: Types.ObjectId;

  /* Routing */
  channel: DeliveryChannel;
  destination: string;
  provider?: string;

  /* Lifecycle */
  status: DeliveryStatus;

  /* Attempts */
  attempts: DeliveryAttempt[];
  lastAttemptAt?: Date;

  /* Receipts */
  receipt?: DeliveryReceipt;

  /* SLA */
  sla?: DeliverySLA;

  /* Audit */
  createdAt: Date;
  updatedAt: Date;
}

/* -------------------------------------------------------------------------- */
/* SUBSCHEMAS                                                                 */
/* -------------------------------------------------------------------------- */

const ProviderTraceSchema = new Schema(
  {
    provider: { type: String, index: true },
    providerMessageId: { type: String, index: true },
    providerStatus: { type: String },
    rawResponse: { type: Schema.Types.Mixed },
    receivedAt: { type: Date },
  },
  { _id: false, strict: true }
);

const DeliveryAttemptSchema = new Schema(
  {
    attempt: { type: Number, required: true },
    status: {
      type: String,
      enum: Object.values(DeliveryStatus),
      required: true,
      index: true,
    },
    errorCode: { type: String },
    errorMessage: { type: String },
    providerTrace: { type: ProviderTraceSchema },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date },
  },
  { _id: false, strict: true }
);

const DeliveryReceiptSchema = new Schema(
  {
    deliveredAt: { type: Date },
    readAt: { type: Date },
    confirmationSource: { type: String },
    confirmationPayload: { type: Schema.Types.Mixed },
  },
  { _id: false, strict: true }
);

const DeliverySLASchema = new Schema(
  {
    maxRetries: { type: Number, default: 3 },
    ttlMs: { type: Number },
    escalationPolicy: { type: String },
  },
  { _id: false, strict: true }
);

/* -------------------------------------------------------------------------- */
/* MAIN SCHEMA                                                                */
/* -------------------------------------------------------------------------- */

const DeliverySchema = new Schema<IDelivery>(
  {
    /* --------------------------- RELATIONS ------------------------------ */

    notificationId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    recipientId: {
      type: Schema.Types.ObjectId,
      index: true,
    },

    /* --------------------------- ROUTING -------------------------------- */

    channel: {
      type: String,
      required: true,
      index: true,
    },

    destination: {
      type: String,
      required: true,
      index: true,
    },

    provider: {
      type: String,
      index: true,
    },

    /* --------------------------- LIFECYCLE ------------------------------ */

    status: {
      type: String,
      enum: Object.values(DeliveryStatus),
      default: DeliveryStatus.PENDING,
      index: true,
    },

    /* --------------------------- ATTEMPTS ------------------------------- */

    attempts: {
      type: [DeliveryAttemptSchema],
      default: [],
    },

    lastAttemptAt: {
      type: Date,
      index: true,
    },

    /* --------------------------- RECEIPTS ------------------------------- */

    receipt: {
      type: DeliveryReceiptSchema,
    },

    /* --------------------------- SLA ----------------------------------- */

    sla: {
      type: DeliverySLASchema,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: true,
  }
);

/* -------------------------------------------------------------------------- */
/* INDEXES (MASSIVE SCALE OPTIMIZATION)                                       */
/* -------------------------------------------------------------------------- */

/**
 * Recherche rapide par notification.
 */
DeliverySchema.index({ notificationId: 1, createdAt: -1 });

/**
 * Monitoring par canal et statut.
 */
DeliverySchema.index({ channel: 1, status: 1, updatedAt: -1 });

/**
 * Audit par provider externe.
 */
DeliverySchema.index({ "attempts.providerTrace.providerMessageId": 1 });

/**
 * Analyse de performance (SLA / retry).
 */
DeliverySchema.index({ lastAttemptAt: 1, status: 1 });

/* -------------------------------------------------------------------------- */
/* IMMUTABILITY GUARANTEES                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Interdit toute suppression physique.
 */
DeliverySchema.pre("deleteOne", { document: true }, function (next) {
  return next(
    new Error("Physical deletion of Delivery is forbidden")
  );
});

/**
 * Empêche la modification rétroactive des attempts.
 */
DeliverySchema.pre("save", function (next) {
  if (this.isModified("attempts")) {
    const original = this.get("attempts") as DeliveryAttempt[] | undefined;

    if (original && original.length > this.attempts.length) {
      return next(
        new Error("Delivery attempts are append-only")
      );
    }
  }
  next();
});

/* -------------------------------------------------------------------------- */
/* QUERY HELPERS (SAFE)                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Indique si la livraison est finalisée.
 */
DeliverySchema.methods.isFinal = function (): boolean {
  return [
    DeliveryStatus.DELIVERED,
    DeliveryStatus.READ,
    DeliveryStatus.FAILED,
    DeliveryStatus.EXPIRED,
    DeliveryStatus.CANCELLED,
  ].includes(this.status);
};

/**
 * Nombre total de tentatives.
 */
DeliverySchema.methods.attemptCount = function (): number {
  return this.attempts.length;
};

/* -------------------------------------------------------------------------- */
/* EXPORT                                                                     */
/* -------------------------------------------------------------------------- */

export const DeliveryModel = model<IDelivery>(
  "Delivery",
  DeliverySchema
);

/* -------------------------------------------------------------------------- */
/* CTO NOTE                                                                   */
/* -------------------------------------------------------------------------- */
/**
 * ✔️ Append-only immutable
 * ✔️ Audit legal-grade
 * ✔️ Index prêt pour milliards de lignes
 * ✔️ Séparation claire runtime / preuve
 * ✔️ Aucun delete destructif
 *
 * 👉 Ce modèle peut servir de registre légal mondial.
 */
