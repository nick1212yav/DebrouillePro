/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE NOTIFICATION — DELIVERY TYPES (WORLD #1)                       */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/notification/delivery/delivery.types.ts            */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*  - Définir le contrat universel de livraison                               */
/*  - Garantir traçabilité, auditabilité, preuve                              */
/*  - Supporter multi-canaux, retries, SLA, IA                                */
/*                                                                            */
/*  AUCUNE LOGIQUE ICI                                                        */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Types } from "mongoose";

/* -------------------------------------------------------------------------- */
/* DELIVERY STATUS                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Cycle de vie universel d’une tentative de livraison.
 */
export enum DeliveryStatus {
  PENDING = "PENDING",        // En attente d’envoi
  SENDING = "SENDING",        // En cours d’envoi
  SENT = "SENT",              // Accepté par le provider
  DELIVERED = "DELIVERED",    // Confirmé reçu
  READ = "READ",              // Confirmé lu (si supporté)
  FAILED = "FAILED",          // Échec définitif
  EXPIRED = "EXPIRED",        // TTL dépassé
  CANCELLED = "CANCELLED",    // Annulé volontairement
}

/* -------------------------------------------------------------------------- */
/* DELIVERY CHANNEL                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Canaux physiques de livraison.
 */
export type DeliveryChannel =
  | "PUSH"
  | "SMS"
  | "EMAIL"
  | "CHAT"
  | "OFFLINE";

/* -------------------------------------------------------------------------- */
/* PROVIDER TRACE                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Traçabilité du fournisseur externe.
 */
export interface ProviderTrace {
  provider: string;                // ex: twilio, fcm, sendgrid
  providerMessageId?: string;      // id externe
  providerStatus?: string;         // status brut provider
  rawResponse?: Record<string, unknown>;
  receivedAt?: Date;
}

/* -------------------------------------------------------------------------- */
/* DELIVERY ATTEMPT                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Une tentative de livraison (retry = nouvel attempt).
 */
export interface DeliveryAttempt {
  attempt: number;
  status: DeliveryStatus;
  errorCode?: string;
  errorMessage?: string;
  providerTrace?: ProviderTrace;
  startedAt: Date;
  endedAt?: Date;
}

/* -------------------------------------------------------------------------- */
/* DELIVERY RECEIPT                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Reçu de livraison certifiable.
 */
export interface DeliveryReceipt {
  deliveredAt?: Date;
  readAt?: Date;
  confirmationSource?: string;   // webhook, carrier report, device ack
  confirmationPayload?: Record<string, unknown>;
}

/* -------------------------------------------------------------------------- */
/* DELIVERY SLA                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Objectifs de service.
 */
export interface DeliverySLA {
  maxRetries: number;
  ttlMs: number;                  // durée maximale avant expiration
  escalationPolicy?: string;     // référence rules/escalation
}

/* -------------------------------------------------------------------------- */
/* DELIVERY CONTRACT                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Contrat canonique de livraison.
 */
export interface DeliveryContract {
  _id: Types.ObjectId;

  /* Relations */
  notificationId: Types.ObjectId;
  recipientId?: Types.ObjectId;

  /* Routing */
  channel: DeliveryChannel;
  destination: string;            // phone, email, token, endpoint

  /* Lifecycle */
  status: DeliveryStatus;

  /* Attempts */
  attempts: DeliveryAttempt[];
  lastAttemptAt?: Date;

  /* Provider */
  provider?: string;

  /* Receipts */
  receipt?: DeliveryReceipt;

  /* SLA */
  sla?: DeliverySLA;

  /* Audit */
  createdAt: Date;
  updatedAt: Date;
}

/* -------------------------------------------------------------------------- */
/* DELIVERY EVENTS                                                            */
/* -------------------------------------------------------------------------- */

export type DeliveryEvent =
  | {
      type: "DELIVERY_CREATED";
      deliveryId: Types.ObjectId;
      at: Date;
    }
  | {
      type: "DELIVERY_ATTEMPTED";
      deliveryId: Types.ObjectId;
      attempt: number;
      at: Date;
    }
  | {
      type: "DELIVERY_STATUS_CHANGED";
      deliveryId: Types.ObjectId;
      from: DeliveryStatus;
      to: DeliveryStatus;
      at: Date;
    }
  | {
      type: "DELIVERY_CONFIRMED";
      deliveryId: Types.ObjectId;
      confirmedAt: Date;
    }
  | {
      type: "DELIVERY_FAILED";
      deliveryId: Types.ObjectId;
      reason: string;
      at: Date;
    };

/* -------------------------------------------------------------------------- */
/* INVARIANTS                                                                 */
/* -------------------------------------------------------------------------- */

export const DELIVERY_INVARIANTS = {
  DELIVERY_IS_APPEND_ONLY: true,
  ATTEMPTS_ARE_IMMUTABLE: true,
  RECEIPTS_ARE_AUDITABLE: true,
  PROVIDER_TRACE_IS_OPTIONAL_BUT_RECOMMENDED: true,
} as const;
