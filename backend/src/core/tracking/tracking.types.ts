/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE TRACKING — TRACKING TYPES (ULTRA FINAL)                         */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/tracking/tracking.types.ts                          */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Définir les contrats universels d’événements                            */
/*   - Normaliser tous les producteurs (API, IA, CRON, Workers, Edge)         */
/*   - Servir de base aux pipelines Analytics, SIEM, IA, Forensic              */
/*                                                                            */
/*  PRINCIPES :                                                               */
/*   - Typage strict                                                          */
/*   - Extensibilité contrôlée                                                 */
/*   - Compatibilité backward                                                 */
/*   - Zéro ambiguïté sémantique                                               */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Types } from "mongoose";
import { IdentityKind } from "../identity/identity.types";

/* -------------------------------------------------------------------------- */
/* GLOBAL EVENT IDS                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Identifiant universel d’événement (trace cross-system).
 */
export type EventId = string;

/**
 * Identifiant de corrélation multi-services.
 */
export type CorrelationId = string;

/**
 * Identifiant de session logique.
 */
export type SessionId = string;

/* -------------------------------------------------------------------------- */
/* EVENT SOURCE                                                               */
/* -------------------------------------------------------------------------- */

export enum EventSource {
  API = "API",
  WORKER = "WORKER",
  CRON = "CRON",
  SYSTEM = "SYSTEM",
  EDGE = "EDGE",
  MOBILE = "MOBILE",
  IOT = "IOT",
  EXTERNAL = "EXTERNAL",
  AI = "AI",
}

/* -------------------------------------------------------------------------- */
/* EVENT DOMAIN                                                               */
/* -------------------------------------------------------------------------- */

export enum EventDomain {
  AUTH = "AUTH",
  ACCESS = "ACCESS",
  PROFILE = "PROFILE",
  DOC = "DOC",
  PAY = "PAY",
  TRUST = "TRUST",
  SEARCH = "SEARCH",
  NOTIFICATION = "NOTIFICATION",
  DELIVERY = "DELIVERY",
  ADMIN = "ADMIN",
  SYSTEM = "SYSTEM",
  SECURITY = "SECURITY",
  ANALYTICS = "ANALYTICS",
}

/* -------------------------------------------------------------------------- */
/* EVENT SEVERITY                                                             */
/* -------------------------------------------------------------------------- */

export enum EventSeverity {
  TRACE = "TRACE",
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

/* -------------------------------------------------------------------------- */
/* EVENT OUTCOME                                                              */
/* -------------------------------------------------------------------------- */

export enum EventOutcome {
  SUCCESS = "SUCCESS",
  FAILURE = "FAILURE",
  DENIED = "DENIED",
  PARTIAL = "PARTIAL",
  RETRY = "RETRY",
  QUEUED = "QUEUED",
}

/* -------------------------------------------------------------------------- */
/* EVENT ACTOR                                                                */
/* -------------------------------------------------------------------------- */

export interface EventActor {
  identityKind?: IdentityKind;
  userId?: Types.ObjectId;
  organizationId?: Types.ObjectId;

  /**
   * Identité technique si non humaine.
   */
  serviceId?: string;
  deviceId?: string;
}

/* -------------------------------------------------------------------------- */
/* EVENT CONTEXT                                                              */
/* -------------------------------------------------------------------------- */

export interface EventContext {
  requestId?: string;
  sessionId?: SessionId;
  correlationId?: CorrelationId;

  ipAddress?: string;
  userAgent?: string;

  geoLocation?: {
    country?: string;
    city?: string;
    region?: string;
    lat?: number;
    lng?: number;
  };

  source: EventSource;

  /**
   * Version du client ou du service émetteur.
   */
  clientVersion?: string;
}

/* -------------------------------------------------------------------------- */
/* EVENT TARGET                                                               */
/* -------------------------------------------------------------------------- */

export interface EventTarget {
  type: string;
  id?: Types.ObjectId | string;
  snapshot?: Record<string, unknown>;
}

/* -------------------------------------------------------------------------- */
/* EVENT PAYLOAD                                                              */
/* -------------------------------------------------------------------------- */

export interface EventPayload {
  message?: string;

  before?: Record<string, unknown>;
  after?: Record<string, unknown>;

  metadata?: Record<string, unknown>;
}

/* -------------------------------------------------------------------------- */
/* RETENTION & COMPLIANCE                                                     */
/* -------------------------------------------------------------------------- */

export interface RetentionPolicy {
  /**
   * Nombre de jours de conservation.
   */
  days: number;

  /**
   * Niveau de confidentialité.
   */
  classification:
    | "PUBLIC"
    | "INTERNAL"
    | "CONFIDENTIAL"
    | "SENSITIVE"
    | "REGULATED";

  /**
   * Droit à l’oubli applicable.
   */
  gdprErasable?: boolean;
}

/* -------------------------------------------------------------------------- */
/* CANONICAL EVENT                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Contrat universel d’événement Débrouille.
 */
export interface CanonicalEvent {
  id: EventId;
  domain: EventDomain;
  action: string;
  outcome: EventOutcome;
  severity: EventSeverity;

  actor?: EventActor;
  context: EventContext;
  target?: EventTarget;
  payload?: EventPayload;

  retention?: RetentionPolicy;

  createdAt: Date;
}

/* -------------------------------------------------------------------------- */
/* TYPE HELPERS                                                               */
/* -------------------------------------------------------------------------- */

export type EventFilter = Partial<{
  domain: EventDomain;
  severity: EventSeverity;
  outcome: EventOutcome;
  actorId: Types.ObjectId;
  targetType: string;
  from: Date;
  to: Date;
}>;

export type EventAggregation = {
  count: number;
  byDomain: Record<EventDomain, number>;
  bySeverity: Record<EventSeverity, number>;
  byOutcome: Record<EventOutcome, number>;
};

/* -------------------------------------------------------------------------- */
/* INVARIANTS                                                                 */
/* -------------------------------------------------------------------------- */

export const TRACKING_INVARIANTS = {
  EVENT_IS_IMMUTABLE: true,
  ACTOR_IS_OPTIONAL_FOR_SYSTEM_EVENTS: true,
  CORRELATION_IS_RECOMMENDED: true,
  PAYLOAD_IS_SANITIZED: true,
  RETENTION_IS_MANDATORY_FOR_REGULATED: true,
} as const;

/* -------------------------------------------------------------------------- */
/* TYPE GUARDS                                                                */
/* -------------------------------------------------------------------------- */

export const isCriticalEvent = (
  event: CanonicalEvent
): boolean =>
  event.severity === EventSeverity.CRITICAL;

export const isSecurityEvent = (
  event: CanonicalEvent
): boolean =>
  event.domain === EventDomain.SECURITY;

export const isSystemEvent = (
  event: CanonicalEvent
): boolean =>
  event.domain === EventDomain.SYSTEM;
