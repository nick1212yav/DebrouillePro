/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE NOTIFICATION — ESCALATION RULES (CRITICAL DELIVERY ENGINE)      */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/notification/rules/escalation.rules.ts              */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*  - Garantir la livraison des notifications CRITIQUES                       */
/*  - Escalader automatiquement entre canaux                                  */
/*  - Survivre aux pannes réseau, cloud, opérateurs                            */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  NotificationChannel,
  NotificationUrgency,
} from "../notification.types";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type EscalationContext = {
  urgency: NotificationUrgency;

  /** Canal actuellement utilisé */
  currentChannel: NotificationChannel;

  /** Tentatives précédentes */
  attempts: {
    channel: NotificationChannel;
    failedAt: Date;
    reason?: string;
  }[];

  /** Capacités du destinataire */
  recipientCapabilities?: {
    hasSmartphone?: boolean;
    hasInternet?: boolean;
    hasSimCard?: boolean;
    supportsUssd?: boolean;
    supportsMesh?: boolean;
  };

  /** Temps écoulé depuis le premier envoi */
  elapsedMs: number;
};

export type EscalationDecision =
  | {
      action: "RETRY_CURRENT";
      delayMs: number;
      reason: string;
    }
  | {
      action: "SWITCH_CHANNEL";
      nextChannel: NotificationChannel;
      reason: string;
    }
  | {
      action: "ESCALATE_OFFLINE";
      nextChannel: NotificationChannel;
      reason: string;
    }
  | {
      action: "GIVE_UP";
      reason: string;
    };

/* -------------------------------------------------------------------------- */
/* ESCALATION MATRIX                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Ordre de priorité des canaux par résilience.
 */
const ESCALATION_PRIORITY: NotificationChannel[] = [
  "PUSH",
  "EMAIL",
  "SMS",
  "WHATSAPP",
  "TELEGRAM",
  "USSD",
  "MESH",
];

/* -------------------------------------------------------------------------- */
/* ENGINE                                                                     */
/* -------------------------------------------------------------------------- */

export class EscalationRules {
  /* ======================================================================== */
  /* MAIN DECISION                                                            */
  /* ======================================================================== */

  static evaluate(
    context: EscalationContext
  ): EscalationDecision {
    /* -------------------------------------------------------------------- */
    /* NON CRITICAL → NO ESCALATION                                          */
    /* -------------------------------------------------------------------- */

    if (
      context.urgency !==
      NotificationUrgency.CRITICAL
    ) {
      return {
        action: "GIVE_UP",
        reason:
          "Escalation disabled for non-critical notifications",
      };
    }

    /* -------------------------------------------------------------------- */
    /* MAX TIME BUDGET (SAFETY)                                              */
    /* -------------------------------------------------------------------- */

    if (context.elapsedMs > 1000 * 60 * 60) {
      return {
        action: "GIVE_UP",
        reason:
          "Escalation timeout exceeded (1h)",
      };
    }

    /* -------------------------------------------------------------------- */
    /* RETRY CURRENT CHANNEL (FAST FAILURES)                                */
    /* -------------------------------------------------------------------- */

    const recentFailures = context.attempts.filter(
      (a) =>
        a.channel === context.currentChannel
    );

    if (recentFailures.length < 2) {
      return {
        action: "RETRY_CURRENT",
        delayMs: 5_000,
        reason:
          "Transient failure, retrying same channel",
      };
    }

    /* -------------------------------------------------------------------- */
    /* FIND NEXT BEST CHANNEL                                                */
    /* -------------------------------------------------------------------- */

    const triedChannels = new Set(
      context.attempts.map((a) => a.channel)
    );

    const nextChannel =
      ESCALATION_PRIORITY.find(
        (channel) =>
          !triedChannels.has(channel) &&
          this.isChannelSupported(
            channel,
            context.recipientCapabilities
          )
      );

    if (nextChannel) {
      return {
        action: "SWITCH_CHANNEL",
        nextChannel,
        reason:
          "Switching to more resilient channel",
      };
    }

    /* -------------------------------------------------------------------- */
    /* FALLBACK OFFLINE                                                      */
    /* -------------------------------------------------------------------- */

    const offlineFallback =
      this.resolveOfflineFallback(
        context.recipientCapabilities
      );

    if (offlineFallback) {
      return {
        action: "ESCALATE_OFFLINE",
        nextChannel: offlineFallback,
        reason:
          "All online channels exhausted, escalating offline",
      };
    }

    /* -------------------------------------------------------------------- */
    /* GIVE UP (LAST RESORT)                                                 */
    /* -------------------------------------------------------------------- */

    return {
      action: "GIVE_UP",
      reason:
        "No viable escalation path remaining",
    };
  }

  /* ======================================================================== */
  /* CHANNEL CAPABILITY CHECK                                                 */
  /* ======================================================================== */

  private static isChannelSupported(
    channel: NotificationChannel,
    caps?: EscalationContext["recipientCapabilities"]
  ): boolean {
    if (!caps) return true;

    switch (channel) {
      case "PUSH":
        return (
          caps.hasSmartphone === true &&
          caps.hasInternet === true
        );

      case "EMAIL":
        return caps.hasInternet === true;

      case "SMS":
      case "WHATSAPP":
        return caps.hasSimCard === true;

      case "USSD":
        return caps.supportsUssd === true;

      case "MESH":
        return caps.supportsMesh === true;

      default:
        return true;
    }
  }

  /* ======================================================================== */
  /* OFFLINE FALLBACK RESOLUTION                                              */
  /* ======================================================================== */

  private static resolveOfflineFallback(
    caps?: EscalationContext["recipientCapabilities"]
  ): NotificationChannel | null {
    if (!caps) return null;

    if (caps.supportsUssd) return "USSD";
    if (caps.supportsMesh) return "MESH";

    return null;
  }
}
