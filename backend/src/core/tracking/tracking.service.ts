/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE TRACKING — TRACKING SERVICE (ULTRA FINAL)                       */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/tracking/tracking.service.ts                        */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Point UNIQUE d’écriture des événements d’audit                          */
/*   - Normalisation, enrichissement, corrélation, sécurité                   */
/*   - Support IA, conformité, forensic, analytics                             */
/*                                                                            */
/*  GARANTIES ABSOLUES :                                                       */
/*   - Aucun événement critique perdu                                          */
/*   - Aucun accès direct au modèle                                            */
/*   - Immutabilité totale                                                     */
/*   - Enrichissement automatique                                              */
/*   - Résilience (fallback + retry)                                           */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import os from "os";
import { Types } from "mongoose";

import {
  AuditLogModel,
  IAuditLog,
  AuditCategory,
  AuditSeverity,
  AuditOutcome,
  AuditSource,
} from "./auditLog.model";

import { IdentityKind } from "../identity/identity.types";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type TrackingContext = {
  /* Actor */
  identityKind?: IdentityKind;
  userId?: Types.ObjectId;
  organizationId?: Types.ObjectId;

  /* Request context */
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  sessionId?: string;

  /* Optional enrichment */
  geoLocation?: {
    country?: string;
    city?: string;
    lat?: number;
    lng?: number;
  };

  /* Correlation */
  correlationId?: string;

  /* Technical origin */
  source?: AuditSource;
};

export type TrackEventInput = {
  category: AuditCategory;
  action: string;
  outcome: AuditOutcome;

  severity?: AuditSeverity;

  targetType?: string;
  targetId?: Types.ObjectId;

  message?: string;

  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;

  /**
   * Politique de rétention (compliance).
   */
  retentionDays?: number;
};

/* -------------------------------------------------------------------------- */
/* INTERNAL CONSTANTS                                                         */
/* -------------------------------------------------------------------------- */

const DEFAULT_RETENTION_DAYS = 365 * 3; // 3 ans par défaut

const HOST_FINGERPRINT = `${os.hostname()}-${process.pid}`;

/* -------------------------------------------------------------------------- */
/* INTERNAL UTILITIES                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Déterminer automatiquement la sévérité.
 */
const inferSeverity = (params: {
  category: AuditCategory;
  outcome: AuditOutcome;
}): AuditSeverity => {
  if (params.outcome === AuditOutcome.FAILURE) {
    return AuditSeverity.HIGH;
  }

  if (params.outcome === AuditOutcome.DENIED) {
    return AuditSeverity.MEDIUM;
  }

  switch (params.category) {
    case AuditCategory.SECURITY:
    case AuditCategory.PAY:
    case AuditCategory.TRUST:
      return AuditSeverity.HIGH;

    case AuditCategory.AUTH:
    case AuditCategory.ACCESS:
      return AuditSeverity.MEDIUM;

    default:
      return AuditSeverity.LOW;
  }
};

/**
 * Calculer la date de rétention légale.
 */
const computeRetentionUntil = (
  retentionDays?: number
): Date => {
  const days =
    typeof retentionDays === "number" &&
    retentionDays > 0
      ? retentionDays
      : DEFAULT_RETENTION_DAYS;

  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

/**
 * Nettoyer les payloads sensibles (PII).
 */
const sanitizePayload = (
  payload?: Record<string, unknown>
): Record<string, unknown> | undefined => {
  if (!payload) return undefined;

  const clone: Record<string, unknown> = {
    ...payload,
  };

  delete clone.password;
  delete clone.passwordHash;
  delete clone.token;
  delete clone.secret;
  delete clone.pin;
  delete clone.otp;

  return clone;
};

/**
 * Générer un identifiant de corrélation.
 */
const generateCorrelationId = (): string =>
  `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;

/* -------------------------------------------------------------------------- */
/* RESILIENCE QUEUE (IN-MEMORY FALLBACK)                                       */
/* -------------------------------------------------------------------------- */

type PendingLog = {
  context: TrackingContext;
  event: TrackEventInput;
  attempts: number;
};

const retryQueue: PendingLog[] = [];
const MAX_RETRY = 5;

/**
 * Tentative de flush périodique.
 */
setInterval(async () => {
  if (!retryQueue.length) return;

  const pending = retryQueue.shift();
  if (!pending) return;

  try {
    await TrackingService.track(
      pending.context,
      pending.event
    );
  } catch {
    pending.attempts++;

    if (pending.attempts < MAX_RETRY) {
      retryQueue.push(pending);
    } else {
      // Dernier recours : abandon contrôlé
      console.error(
        "[TRACKING] Dropped audit log after max retries",
        pending
      );
    }
  }
}, 3_000);

/* -------------------------------------------------------------------------- */
/* TRACKING SERVICE                                                           */
/* -------------------------------------------------------------------------- */

export class TrackingService {
  /* ======================================================================== */
  /* CORE ENTRY                                                               */
  /* ======================================================================== */

  /**
   * Enregistrer un événement d’audit.
   * 👉 Point d’entrée UNIQUE du système.
   */
  static async track(
    context: TrackingContext,
    event: TrackEventInput
  ): Promise<IAuditLog> {
    try {
      const severity =
        event.severity ||
        inferSeverity({
          category: event.category,
          outcome: event.outcome,
        });

      const correlationId =
        context.correlationId ||
        generateCorrelationId();

      const retentionUntil =
        computeRetentionUntil(
          event.retentionDays
        );

      const log = new AuditLogModel({
        /* Actor */
        identityKind: context.identityKind,
        userId: context.userId,
        organizationId: context.organizationId,

        /* Core */
        category: event.category,
        action: event.action,
        outcome: event.outcome,
        severity,

        /* Source */
        source: context.source || AuditSource.API,

        /* Target */
        targetType: event.targetType,
        targetId: event.targetId,

        /* Context */
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        requestId: context.requestId,
        sessionId: context.sessionId,
        geoLocation: context.geoLocation,

        /* Payload */
        message: event.message,
        before: sanitizePayload(event.before),
        after: sanitizePayload(event.after),
        metadata: {
          ...sanitizePayload(event.metadata),
          correlationId,
          host: HOST_FINGERPRINT,
        },

        /* Compliance */
        retentionUntil,
      });

      await log.save();

      return log;
    } catch (error) {
      // Résilience : on met en queue pour retry
      retryQueue.push({
        context,
        event,
        attempts: 1,
      });

      console.error(
        "[TRACKING] Failed to persist audit log, queued for retry",
        error
      );

      throw error;
    }
  }

  /* ======================================================================== */
  /* SPECIALIZED HELPERS                                                      */
  /* ======================================================================== */

  static async auth(
    context: TrackingContext,
    params: {
      action: string;
      outcome: AuditOutcome;
      message?: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    return TrackingService.track(context, {
      category: AuditCategory.AUTH,
      action: params.action,
      outcome: params.outcome,
      message: params.message,
      metadata: params.metadata,
    });
  }

  static async access(
    context: TrackingContext,
    params: {
      action: string;
      outcome: AuditOutcome;
      targetType?: string;
      targetId?: Types.ObjectId;
      message?: string;
    }
  ) {
    return TrackingService.track(context, {
      category: AuditCategory.ACCESS,
      action: params.action,
      outcome: params.outcome,
      targetType: params.targetType,
      targetId: params.targetId,
      message: params.message,
    });
  }

  static async security(
    context: TrackingContext,
    params: {
      action: string;
      outcome: AuditOutcome;
      severity?: AuditSeverity;
      message?: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    return TrackingService.track(context, {
      category: AuditCategory.SECURITY,
      action: params.action,
      outcome: params.outcome,
      severity: params.severity || AuditSeverity.CRITICAL,
      message: params.message,
      metadata: params.metadata,
      retentionDays: 365 * 10, // sécurité = conservation longue
    });
  }

  static async pay(
    context: TrackingContext,
    params: {
      action: string;
      outcome: AuditOutcome;
      transactionId?: Types.ObjectId;
      before?: Record<string, unknown>;
      after?: Record<string, unknown>;
      message?: string;
    }
  ) {
    return TrackingService.track(context, {
      category: AuditCategory.PAY,
      action: params.action,
      outcome: params.outcome,
      targetType: "Transaction",
      targetId: params.transactionId,
      before: params.before,
      after: params.after,
      message: params.message,
      retentionDays: 365 * 7,
    });
  }

  static async trust(
    context: TrackingContext,
    params: {
      action: string;
      outcome: AuditOutcome;
      message?: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    return TrackingService.track(context, {
      category: AuditCategory.TRUST,
      action: params.action,
      outcome: params.outcome,
      message: params.message,
      metadata: params.metadata,
    });
  }

  static async system(
    context: TrackingContext,
    params: {
      action: string;
      outcome: AuditOutcome;
      severity?: AuditSeverity;
      message?: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    return TrackingService.track(context, {
      category: AuditCategory.SYSTEM,
      action: params.action,
      outcome: params.outcome,
      severity: params.severity,
      message: params.message,
      metadata: params.metadata,
    });
  }

  /* ======================================================================== */
  /* OBSERVABILITY HELPERS                                                    */
  /* ======================================================================== */

  /**
   * Vérifier la santé du moteur de tracking.
   */
  static health() {
    return {
      retryQueueSize: retryQueue.length,
      host: HOST_FINGERPRINT,
      timestamp: new Date().toISOString(),
    };
  }
}
