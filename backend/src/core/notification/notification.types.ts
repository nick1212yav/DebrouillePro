/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE NOTIFICATION — TYPES & CONTRACTS (WORLD #1 CANONICAL)          */
/*  File: backend/src/core/notification/notification.types.ts                */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  VISION :                                                                  */
/*  - Contrat universel de communication humaine et machine                  */
/*  - Multicanal • Multilingue • Offline • IA-first • Sécurisé               */
/*  - Supporte des milliards d’événements / jour                             */
/*                                                                            */
/*  UTILISÉ PAR :                                                            */
/*  - API • Mobile • Web • Edge • IoT • IA • Gouvernements                    */
/*                                                                            */
/*  RÈGLES ABSOLUES :                                                         */
/*  - Aucune logique métier ici                                               */
/*  - 100 % déclaratif                                                       */
/*  - Stable pour 10+ ans                                                     */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Types } from "mongoose";
import { IdentityRef } from "../identity/identity.types";

/* -------------------------------------------------------------------------- */
/* NOTIFICATION CHANNELS                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Canaux physiques de livraison.
 * Extensible sans breaking change.
 */
export enum NotificationChannel {
  IN_APP = "IN_APP",
  PUSH = "PUSH",
  SMS = "SMS",
  EMAIL = "EMAIL",
  WHATSAPP = "WHATSAPP",
  TELEGRAM = "TELEGRAM",
  SIGNAL = "SIGNAL",
  WEBHOOK = "WEBHOOK",
  USSD = "USSD",
  RADIO = "RADIO",          // broadcast rural / emergency
  SATELLITE = "SATELLITE",  // zones isolées
  MESH = "MESH",            // réseau communautaire offline
}

/* -------------------------------------------------------------------------- */
/* DELIVERY PRIORITY                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Priorité opérationnelle.
 * Influence : routage, retry, coût, escalade.
 */
export enum NotificationPriority {
  LOW = "LOW",
  NORMAL = "NORMAL",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",   // santé, sécurité, catastrophe
  LIFE_SAVING = "LIFE_SAVING",
}

/* -------------------------------------------------------------------------- */
/* DELIVERY MODE                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Mode d’émission.
 */
export enum NotificationMode {
  REALTIME = "REALTIME",
  SCHEDULED = "SCHEDULED",
  BATCH = "BATCH",
  BROADCAST = "BROADCAST",
  OFFLINE_SYNC = "OFFLINE_SYNC",
}

/* -------------------------------------------------------------------------- */
/* LOCALIZATION                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Langue normalisée ISO.
 */
export type LanguageCode =
  | "fr"
  | "en"
  | "sw"
  | "ln"
  | "kg"
  | "es"
  | "pt"
  | "ar"
  | "zh";

/* -------------------------------------------------------------------------- */
/* NOTIFICATION INTENT                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Intention métier de la notification.
 * Permet IA, analytics, priorisation automatique.
 */
export enum NotificationIntent {
  INFORMATION = "INFORMATION",
  ACTION_REQUIRED = "ACTION_REQUIRED",
  PAYMENT = "PAYMENT",
  SECURITY = "SECURITY",
  HEALTH = "HEALTH",
  TRANSPORT = "TRANSPORT",
  DELIVERY = "DELIVERY",
  SOCIAL = "SOCIAL",
  SYSTEM = "SYSTEM",
  MARKETING = "MARKETING",
  EMERGENCY = "EMERGENCY",
}

/* -------------------------------------------------------------------------- */
/* PAYLOAD CONTENT                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Contenu multicanal universel.
 */
export interface NotificationContent {
  title?: string;
  body: string;

  /** Contenu riche optionnel */
  html?: string;
  markdown?: string;

  /** Média */
  imageUrl?: string;
  audioUrl?: string;
  videoUrl?: string;

  /** Actions interactives */
  actions?: {
    label: string;
    action: string;
    deepLink?: string;
  }[];

  /** Données applicatives */
  data?: Record<string, unknown>;
}

/* -------------------------------------------------------------------------- */
/* TARGETING                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Ciblage universel.
 */
export type NotificationTarget =
  | {
      type: "IDENTITY";
      identity: IdentityRef;
    }
  | {
      type: "GROUP";
      groupId: string;
    }
  | {
      type: "SEGMENT";
      segmentKey: string;
    }
  | {
      type: "GEO";
      geo: {
        country?: string;
        city?: string;
        radiusKm?: number;
        lat?: number;
        lng?: number;
      };
    }
  | {
      type: "BROADCAST";
    };

/* -------------------------------------------------------------------------- */
/* DELIVERY RULES                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Contraintes de livraison.
 */
export interface NotificationDeliveryRules {
  allowedChannels?: NotificationChannel[];
  forbiddenChannels?: NotificationChannel[];

  maxRetries?: number;
  ttlSeconds?: number;

  /** Heures silencieuses */
  respectQuietHours?: boolean;

  /** Consentement requis */
  requireConsent?: boolean;

  /** Budget maximum (SMS, satellite, etc.) */
  maxCostUsd?: number;

  /** Priorité minimale de fallback */
  fallbackPriority?: NotificationPriority;
}

/* -------------------------------------------------------------------------- */
/* SCHEDULING                                                                 */
/* -------------------------------------------------------------------------- */

export interface NotificationSchedule {
  sendAt?: Date;
  timezone?: string;
  recurringCron?: string;
}

/* -------------------------------------------------------------------------- */
/* SECURITY                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Sécurité & conformité.
 */
export interface NotificationSecurity {
  encrypted?: boolean;
  signatureRequired?: boolean;
  retentionDays?: number;
  sensitive?: boolean;
}

/* -------------------------------------------------------------------------- */
/* AUDIT                                                                      */
/* -------------------------------------------------------------------------- */

export interface NotificationAudit {
  createdBy?: IdentityRef;
  sourceModule?: string;
  correlationId?: string;
  traceId?: string;
}

/* -------------------------------------------------------------------------- */
/* NOTIFICATION REQUEST (CANONICAL)                                           */
/* -------------------------------------------------------------------------- */

/**
 * Contrat UNIQUE d’émission de notification.
 */
export interface NotificationRequest {
  idempotencyKey?: string;

  intent: NotificationIntent;
  priority: NotificationPriority;
  mode: NotificationMode;

  target: NotificationTarget;

  content: Record<LanguageCode, NotificationContent>;

  rules?: NotificationDeliveryRules;
  schedule?: NotificationSchedule;
  security?: NotificationSecurity;

  audit?: NotificationAudit;
}

/* -------------------------------------------------------------------------- */
/* DELIVERY STATUS                                                            */
/* -------------------------------------------------------------------------- */

export enum NotificationDeliveryStatus {
  PENDING = "PENDING",
  QUEUED = "QUEUED",
  SENDING = "SENDING",
  DELIVERED = "DELIVERED",
  READ = "READ",
  FAILED = "FAILED",
  EXPIRED = "EXPIRED",
  CANCELLED = "CANCELLED",
}

/* -------------------------------------------------------------------------- */
/* DELIVERY RECEIPT                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Traçabilité par canal.
 */
export interface NotificationDeliveryReceipt {
  channel: NotificationChannel;
  provider?: string;

  status: NotificationDeliveryStatus;

  attempts: number;
  lastAttemptAt?: Date;

  deliveredAt?: Date;
  readAt?: Date;

  errorCode?: string;
  errorMessage?: string;

  costUsd?: number;
  latencyMs?: number;
}

/* -------------------------------------------------------------------------- */
/* NOTIFICATION ENTITY (PERSISTED)                                            */
/* -------------------------------------------------------------------------- */

export interface NotificationEntity {
  _id: Types.ObjectId;

  request: NotificationRequest;

  resolvedChannels: NotificationChannel[];

  deliveryReceipts: NotificationDeliveryReceipt[];

  globalStatus: NotificationDeliveryStatus;

  createdAt: Date;
  updatedAt: Date;
}

/* -------------------------------------------------------------------------- */
/* EVENTS                                                                     */
/* -------------------------------------------------------------------------- */

export type NotificationEvent =
  | {
      type: "NOTIFICATION_CREATED";
      notificationId: Types.ObjectId;
      at: Date;
    }
  | {
      type: "DELIVERY_ATTEMPTED";
      channel: NotificationChannel;
      at: Date;
    }
  | {
      type: "DELIVERED";
      channel: NotificationChannel;
      at: Date;
    }
  | {
      type: "FAILED";
      channel: NotificationChannel;
      reason: string;
      at: Date;
    };

/* -------------------------------------------------------------------------- */
/* INVARIANTS                                                                 */
/* -------------------------------------------------------------------------- */

export const NOTIFICATION_INVARIANTS = {
  DELIVERY_IS_EVENTUALLY_CONSISTENT: true,
  EVERY_NOTIFICATION_IS_AUDITABLE: true,
  PRIORITY_DRIVES_ROUTING: true,
  CONSENT_IS_MANDATORY: true,
  OFFLINE_IS_FIRST_CLASS: true,
} as const;
