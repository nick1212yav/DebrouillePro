/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE NOTIFICATION — QUIET HOURS RULES (HUMAN-FIRST ENGINE)           */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/notification/rules/quiet-hours.rules.ts             */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*  - Protéger le sommeil et la concentration des utilisateurs                */
/*  - Adapter selon pays, culture, profil                                     */
/*  - Toujours laisser passer les urgences critiques                          */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  NotificationChannel,
  NotificationUrgency,
} from "../notification.types";

/* -------------------------------------------------------------------------- */
/* CONTEXT                                                                    */
/* -------------------------------------------------------------------------- */

export type QuietHoursContext = {
  /** Heure locale du destinataire */
  localTime: Date;

  /** Code pays ISO (ex: CD, FR, US) */
  countryCode?: string;

  /** Fuseau horaire IANA */
  timezone?: string;

  /** Canal utilisé */
  channel: NotificationChannel;

  /** Urgence métier */
  urgency: NotificationUrgency;

  /** Préférences utilisateur */
  userPreferences?: {
    quietHoursEnabled?: boolean;
    customQuietStart?: number; // 0–23
    customQuietEnd?: number;   // 0–23
  };
};

/* -------------------------------------------------------------------------- */
/* DECISION                                                                   */
/* -------------------------------------------------------------------------- */

export type QuietHoursDecision =
  | { allowed: true }
  | {
      allowed: false;
      nextAllowedAt: Date;
      reason: string;
    };

/* -------------------------------------------------------------------------- */
/* DEFAULT CULTURAL WINDOWS                                                   */
/* -------------------------------------------------------------------------- */

const DEFAULT_QUIET_WINDOWS: Record<
  string,
  { start: number; end: number }
> = {
  GLOBAL: { start: 22, end: 7 },
  CD: { start: 21, end: 6 },
  FR: { start: 22, end: 7 },
  US: { start: 23, end: 7 },
};

/* -------------------------------------------------------------------------- */
/* ENGINE                                                                     */
/* -------------------------------------------------------------------------- */

export class QuietHoursRules {
  /* ======================================================================== */
  /* MAIN EVALUATION                                                          */
  /* ======================================================================== */

  static evaluate(
    context: QuietHoursContext
  ): QuietHoursDecision {
    /* -------------------------------------------------------------------- */
    /* CRITICAL ALWAYS PASSES                                                */
    /* -------------------------------------------------------------------- */

    if (
      context.urgency ===
      NotificationUrgency.CRITICAL
    ) {
      return { allowed: true };
    }

    /* -------------------------------------------------------------------- */
    /* USER DISABLED QUIET MODE                                              */
    /* -------------------------------------------------------------------- */

    if (
      context.userPreferences
        ?.quietHoursEnabled === false
    ) {
      return { allowed: true };
    }

    const hour = context.localTime.getHours();

    const window =
      this.resolveQuietWindow(context);

    if (!this.isInQuietWindow(hour, window)) {
      return { allowed: true };
    }

    const nextAllowedAt =
      this.computeNextAllowedTime(
        context.localTime,
        window.end
      );

    return {
      allowed: false,
      nextAllowedAt,
      reason: "Recipient is in quiet hours",
    };
  }

  /* ======================================================================== */
  /* WINDOW RESOLUTION                                                        */
  /* ======================================================================== */

  private static resolveQuietWindow(
    context: QuietHoursContext
  ): { start: number; end: number } {
    if (
      context.userPreferences?.customQuietStart !==
        undefined &&
      context.userPreferences?.customQuietEnd !==
        undefined
    ) {
      return {
        start:
          context.userPreferences.customQuietStart,
        end:
          context.userPreferences.customQuietEnd,
      };
    }

    if (
      context.countryCode &&
      DEFAULT_QUIET_WINDOWS[
        context.countryCode
      ]
    ) {
      return DEFAULT_QUIET_WINDOWS[
        context.countryCode
      ];
    }

    return DEFAULT_QUIET_WINDOWS.GLOBAL;
  }

  /* ======================================================================== */
  /* WINDOW CHECK                                                             */
  /* ======================================================================== */

  private static isInQuietWindow(
    hour: number,
    window: { start: number; end: number }
  ): boolean {
    if (window.start < window.end) {
      return hour >= window.start &&
        hour < window.end;
    }

    return (
      hour >= window.start ||
      hour < window.end
    );
  }

  /* ======================================================================== */
  /* NEXT ALLOWED TIME                                                        */
  /* ======================================================================== */

  private static computeNextAllowedTime(
    now: Date,
    allowedHour: number
  ): Date {
    const next = new Date(now);
    next.setHours(allowedHour, 0, 0, 0);

    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    return next;
  }
}
