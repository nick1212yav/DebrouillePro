/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE NOTIFICATION — CHANNEL INTERFACE (WORLD #1 CANONICAL)         */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/notification/channels/channel.interface.ts         */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE STRATÉGIQUE :                                                        */
/*  - Définir le contrat universel de tous les canaux de livraison            */
/*  - Garantir fiabilité, traçabilité, résilience                              */
/*  - Permettre l’orchestration IA, retry, fallback                           */
/*                                                                            */
/*  CE FICHIER EST SACRÉ :                                                     */
/*  - Aucun channel ne contourne ce contrat                                   */
/*  - Toute évolution est rétro-compatible                                    */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Types } from "mongoose";

/* -------------------------------------------------------------------------- */
/* DELIVERY STATUS                                                           */
/* -------------------------------------------------------------------------- */

export enum ChannelDeliveryStatus {
  PENDING = "PENDING",
  SENT = "SENT",
  DELIVERED = "DELIVERED",
  FAILED = "FAILED",
  RETRYING = "RETRYING",
  THROTTLED = "THROTTLED",
  CANCELLED = "CANCELLED",
}

/* -------------------------------------------------------------------------- */
/* FAILURE REASONS                                                           */
/* -------------------------------------------------------------------------- */

export enum ChannelFailureReason {
  NETWORK_ERROR = "NETWORK_ERROR",
  PROVIDER_ERROR = "PROVIDER_ERROR",
  INVALID_TARGET = "INVALID_TARGET",
  RATE_LIMITED = "RATE_LIMITED",
  TIMEOUT = "TIMEOUT",
  AUTH_ERROR = "AUTH_ERROR",
  PAYLOAD_REJECTED = "PAYLOAD_REJECTED",
  CONSENT_BLOCKED = "CONSENT_BLOCKED",
  UNKNOWN = "UNKNOWN",
}

/* -------------------------------------------------------------------------- */
/* CHANNEL CAPABILITIES                                                      */
/* -------------------------------------------------------------------------- */

export type ChannelCapabilities = {
  supportsRichMedia: boolean;
  supportsBatch: boolean;
  supportsScheduling: boolean;
  supportsDeliveryReceipt: boolean;
  supportsTwoWay: boolean;
  supportsLocalization: boolean;
  supportsPriority: boolean;
  supportsOffline: boolean;
};

/* -------------------------------------------------------------------------- */
/* CHANNEL TARGET                                                             */
/* -------------------------------------------------------------------------- */

export type ChannelTarget =
  | {
      type: "DEVICE";
      deviceToken: string;
      platform?: "ANDROID" | "IOS" | "WEB";
    }
  | {
      type: "PHONE";
      phoneNumber: string;
      countryCode?: string;
    }
  | {
      type: "EMAIL";
      email: string;
    }
  | {
      type: "CHAT_ID";
      chatId: string;
      provider:
        | "WHATSAPP"
        | "TELEGRAM"
        | "SIGNAL"
        | "MESSENGER";
    }
  | {
      type: "OFFLINE";
      meshId?: string;
      ussdCode?: string;
    };

/* -------------------------------------------------------------------------- */
/* CHANNEL PAYLOAD                                                            */
/* -------------------------------------------------------------------------- */

export interface ChannelPayload {
  title?: string;
  body: string;
  data?: Record<string, unknown>;
  locale?: string;

  priority?: number; // 1..10
  ttlSeconds?: number;

  richMedia?: {
    imageUrl?: string;
    videoUrl?: string;
    audioUrl?: string;
    fileUrl?: string;
  };
}

/* -------------------------------------------------------------------------- */
/* DELIVERY RESULT                                                            */
/* -------------------------------------------------------------------------- */

export interface ChannelDeliveryResult {
  status: ChannelDeliveryStatus;
  providerMessageId?: string;
  deliveredAt?: Date;
  failureReason?: ChannelFailureReason;
  rawResponse?: unknown;
}

/* -------------------------------------------------------------------------- */
/* DELIVERY CONTEXT                                                           */
/* -------------------------------------------------------------------------- */

export interface ChannelDeliveryContext {
  notificationId: Types.ObjectId;
  attempt: number;
  correlationId: string;

  scheduledAt?: Date;
  expiresAt?: Date;

  trace?: {
    requestId?: string;
    source?: string;
  };
}

/* -------------------------------------------------------------------------- */
/* CHANNEL HEALTH                                                             */
/* -------------------------------------------------------------------------- */

export interface ChannelHealth {
  channel: string;
  healthy: boolean;
  latencyMs?: number;
  errorRate?: number;
  lastCheckedAt: Date;
  metadata?: Record<string, unknown>;
}

/* -------------------------------------------------------------------------- */
/* CHANNEL INTERFACE (CONTRACT)                                               */
/* -------------------------------------------------------------------------- */

export interface NotificationChannel {
  /**
   * Nom unique du canal.
   * Ex: "push.fcm", "sms.twilio", "email.smtp"
   */
  readonly name: string;

  /**
   * Capacités déclaratives.
   */
  readonly capabilities: ChannelCapabilities;

  /**
   * Vérifier la santé du canal.
   */
  healthCheck(): Promise<ChannelHealth>;

  /**
   * Envoyer un message.
   */
  send(params: {
    target: ChannelTarget;
    payload: ChannelPayload;
    context: ChannelDeliveryContext;
  }): Promise<ChannelDeliveryResult>;

  /**
   * Annuler une livraison (si supportée).
   */
  cancel?(params: {
    providerMessageId: string;
  }): Promise<boolean>;
}

/* -------------------------------------------------------------------------- */
/* GUARANTEES                                                                 */
/* -------------------------------------------------------------------------- */

export const CHANNEL_INVARIANTS = {
  ALL_CHANNELS_ARE_PLUGGABLE: true,
  ALL_DELIVERIES_ARE_TRACEABLE: true,
  FAILURES_ARE_EXPLAINABLE: true,
  FALLBACK_IS_SUPPORTED: true,
  OFFLINE_IS_FIRST_CLASS: true,
} as const;

/* -------------------------------------------------------------------------- */
/* CTO NOTE                                                                   */
/* -------------------------------------------------------------------------- */
/**
 * ✔️ Contrat unique pour tous les transports
 * ✔️ Prêt pour IA de routage
 * ✔️ Résilience cloud-grade
 * ✔️ Offline-first natif
 * ✔️ Observabilité native
 *
 * 👉 Ce fichier survivra 10+ ans sans refactor majeur.
 */
