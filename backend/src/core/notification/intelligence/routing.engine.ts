/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE NOTIFICATION — ROUTING INTELLIGENCE ENGINE (WORLD #1)           */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/notification/intelligence/routing.engine.ts        */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*  - Sélectionner le meilleur canal de livraison en temps réel               */
/*  - Optimiser fiabilité, coût, latence, disponibilité                        */
/*  - Assurer fallback automatique multi-canaux                               */
/*  - Fonctionner même en conditions réseau dégradées                         */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Types } from "mongoose";

import {
  NotificationChannel,
  NotificationCategory,
  NotificationUrgency,
} from "../notification.types";

import { PriorityScore } from "./priority.engine";

/* -------------------------------------------------------------------------- */
/* ROUTING CONTEXT                                                            */
/* -------------------------------------------------------------------------- */

export type RoutingContext = {
  recipientId?: Types.ObjectId;

  category: NotificationCategory;
  urgency: NotificationUrgency;
  priorityScore: PriorityScore;

  preferredChannels?: NotificationChannel[];
  availableChannels: NotificationChannel[];

  networkQuality?: "OFFLINE" | "POOR" | "GOOD" | "EXCELLENT";
  deviceOnline?: boolean;

  localTime?: Date;
  country?: string;

  lastSuccessfulChannel?: NotificationChannel;
  failureHistory?: Partial<
    Record<NotificationChannel, number>
  >;

  costSensitivity?: "LOW" | "MEDIUM" | "HIGH";
};

/* -------------------------------------------------------------------------- */
/* CHANNEL METRICS                                                            */
/* -------------------------------------------------------------------------- */

type ChannelMetrics = {
  reliability: number; // 0–100
  latency: number; // ms
  cost: number; // relative cost
  offlineCapable: boolean;
};

const CHANNEL_METRICS: Record<
  NotificationChannel,
  ChannelMetrics
> = {
  PUSH: {
    reliability: 85,
    latency: 300,
    cost: 1,
    offlineCapable: false,
  },
  SMS: {
    reliability: 92,
    latency: 1200,
    cost: 4,
    offlineCapable: true,
  },
  EMAIL: {
    reliability: 88,
    latency: 5000,
    cost: 2,
    offlineCapable: false,
  },
  CHAT: {
    reliability: 90,
    latency: 800,
    cost: 1.5,
    offlineCapable: false,
  },
  OFFLINE: {
    reliability: 70,
    latency: 60_000,
    cost: 0.5,
    offlineCapable: true,
  },
};

/* -------------------------------------------------------------------------- */
/* ROUTING ENGINE                                                             */
/* -------------------------------------------------------------------------- */

export class RoutingEngine {
  /* ======================================================================== */
  /* PUBLIC API                                                               */
  /* ======================================================================== */

  static selectBestChannels(
    context: RoutingContext
  ): NotificationChannel[] {
    const scored = context.availableChannels
      .map((channel) => ({
        channel,
        score: this.computeChannelScore(
          channel,
          context
        ),
      }))
      .sort((a, b) => b.score - a.score);

    return scored.map((s) => s.channel);
  }

  /* ======================================================================== */
  /* SCORING ENGINE                                                           */
  /* ======================================================================== */

  private static computeChannelScore(
    channel: NotificationChannel,
    context: RoutingContext
  ): number {
    const metrics = CHANNEL_METRICS[channel];

    let score = 50;

    /* -------------------- Priority boost -------------------- */
    if (context.priorityScore > 80) score += 20;
    if (context.priorityScore > 60) score += 10;

    /* -------------------- Reliability ----------------------- */
    score += metrics.reliability * 0.3;

    /* -------------------- Latency penalty ------------------- */
    score -= Math.min(metrics.latency / 100, 20);

    /* -------------------- Cost sensitivity ------------------ */
    if (context.costSensitivity === "HIGH") {
      score -= metrics.cost * 5;
    } else if (
      context.costSensitivity === "MEDIUM"
    ) {
      score -= metrics.cost * 2;
    }

    /* -------------------- Network conditions ---------------- */
    if (context.networkQuality === "OFFLINE") {
      if (!metrics.offlineCapable) score -= 40;
    }

    if (context.networkQuality === "POOR") {
      score -= metrics.latency / 500;
    }

    /* -------------------- Device availability --------------- */
    if (
      channel === "PUSH" &&
      context.deviceOnline === false
    ) {
      score -= 30;
    }

    /* -------------------- Night adaptation ------------------ */
    if (context.localTime) {
      const hour = context.localTime.getHours();
      if (hour >= 22 || hour <= 6) {
        if (channel === "SMS") score -= 20;
        if (channel === "EMAIL") score -= 10;
      }
    }

    /* -------------------- Failure memory -------------------- */
    const failures =
      context.failureHistory?.[channel] ?? 0;

    score -= failures * 15;

    /* -------------------- Preference boost ------------------ */
    if (
      context.preferredChannels?.includes(
        channel
      )
    ) {
      score += 15;
    }

    /* -------------------- Sticky success -------------------- */
    if (
      context.lastSuccessfulChannel === channel
    ) {
      score += 10;
    }

    return Math.max(0, Math.round(score));
  }
}
