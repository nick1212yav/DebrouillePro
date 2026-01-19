/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE NOTIFICATION — PRIORITY INTELLIGENCE ENGINE (WORLD #1)         */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/notification/intelligence/priority.engine.ts       */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*  - Calculer la priorité réelle d’une notification                          */
/*  - Arbitrer urgence, valeur, risque, contexte                              */
/*  - Produire une priorité stable, explicable, auditable                     */
/*                                                                            */
/*  OBJECTIF :                                                                */
/*  Transformer une intention métier en un ordre d’exécution optimal         */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Types } from "mongoose";
import {
  NotificationCategory,
  NotificationUrgency,
  NotificationPayload,
} from "../notification.types";

/* -------------------------------------------------------------------------- */
/* PRIORITY SCALE                                                             */
/* -------------------------------------------------------------------------- */

/**
 * 0   → silencieux / différable
 * 100 → critique vital / temps réel absolu
 */
export type PriorityScore = number;

/* -------------------------------------------------------------------------- */
/* CONTEXT                                                                    */
/* -------------------------------------------------------------------------- */

export type PriorityContext = {
  recipientId?: Types.ObjectId;
  category: NotificationCategory;
  urgency: NotificationUrgency;
  payload?: NotificationPayload;

  isRetry?: boolean;
  previousFailures?: number;

  localTime?: Date;
  networkQuality?: "OFFLINE" | "POOR" | "GOOD" | "EXCELLENT";

  trustScore?: number;
};

/* -------------------------------------------------------------------------- */
/* INTERNAL WEIGHTS                                                           */
/* -------------------------------------------------------------------------- */

const WEIGHTS = {
  urgency: 0.45,
  category: 0.25,
  reliability: 0.15,
  context: 0.15,
} as const;

/* -------------------------------------------------------------------------- */
/* BASE SCORES                                                                */
/* -------------------------------------------------------------------------- */

const URGENCY_SCORE: Record<
  NotificationUrgency,
  number
> = {
  LOW: 10,
  NORMAL: 40,
  HIGH: 70,
  CRITICAL: 95,
};

const CATEGORY_SCORE: Record<
  NotificationCategory,
  number
> = {
  SYSTEM: 90,
  SECURITY: 95,
  FINANCE: 85,
  HEALTH: 92,
  DELIVERY: 80,
  SOCIAL: 40,
  MARKETING: 20,
  INFORMATION: 50,
};

/* -------------------------------------------------------------------------- */
/* PRIORITY ENGINE                                                            */
/* -------------------------------------------------------------------------- */

export class PriorityEngine {
  /* ======================================================================== */
  /* PUBLIC API                                                               */
  /* ======================================================================== */

  static compute(
    context: PriorityContext
  ): PriorityScore {
    const urgencyScore =
      URGENCY_SCORE[context.urgency] ?? 30;

    const categoryScore =
      CATEGORY_SCORE[context.category] ?? 40;

    const reliabilityScore =
      this.computeReliabilityFactor(context);

    const contextualScore =
      this.computeContextualFactor(context);

    const weighted =
      urgencyScore * WEIGHTS.urgency +
      categoryScore * WEIGHTS.category +
      reliabilityScore * WEIGHTS.reliability +
      contextualScore * WEIGHTS.context;

    return Math.max(0, Math.min(100, Math.round(weighted)));
  }

  /* ======================================================================== */
  /* RELIABILITY FACTOR                                                       */
  /* ======================================================================== */

  /**
   * Plus une notification échoue, plus elle devient prioritaire
   * afin d’éviter les pertes silencieuses.
   */
  private static computeReliabilityFactor(
    context: PriorityContext
  ): number {
    const failures = context.previousFailures ?? 0;

    if (failures === 0) return 40;
    if (failures === 1) return 55;
    if (failures === 2) return 70;
    if (failures >= 3) return 85;

    return 40;
  }

  /* ======================================================================== */
  /* CONTEXTUAL FACTOR                                                        */
  /* ======================================================================== */

  /**
   * Ajustement intelligent selon contexte réel.
   */
  private static computeContextualFactor(
    context: PriorityContext
  ): number {
    let score = 50;

    /* -------------------- Network quality -------------------- */
    if (context.networkQuality === "OFFLINE")
      score -= 20;
    if (context.networkQuality === "POOR") score -= 10;
    if (context.networkQuality === "EXCELLENT")
      score += 10;

    /* -------------------- Trust score ------------------------- */
    if (
      typeof context.trustScore === "number"
    ) {
      if (context.trustScore > 80) score += 10;
      if (context.trustScore < 30) score -= 10;
    }

    /* -------------------- Retry bonus ------------------------- */
    if (context.isRetry) score += 10;

    /* -------------------- Night sensitivity ------------------- */
    if (context.localTime) {
      const hour = context.localTime.getHours();
      if (hour >= 23 || hour <= 5) {
        score -= 15;
      }
    }

    return Math.max(0, Math.min(100, score));
  }
}
