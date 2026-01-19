/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE NOTIFICATION — PERSONALIZATION INTELLIGENCE ENGINE (WORLD #1)  */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/notification/intelligence/personalization.engine.ts*/
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*  - Personnaliser dynamiquement chaque message                              */
/*  - Adapter langue, ton, format, longueur                                   */
/*  - Respecter préférences culturelles et historiques utilisateur            */
/*  - Maximiser engagement et compréhension                                   */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Types } from "mongoose";

import {
  NotificationChannel,
  NotificationUrgency,
  NotificationCategory,
} from "../notification.types";

/* -------------------------------------------------------------------------- */
/* PERSONALIZATION CONTEXT                                                    */
/* -------------------------------------------------------------------------- */

export type PersonalizationContext = {
  recipientId?: Types.ObjectId;

  language?: string; // "fr", "sw", "en", "ln"
  country?: string;

  preferredTone?: "FORMAL" | "FRIENDLY" | "DIRECT";
  literacyLevel?: "LOW" | "MEDIUM" | "HIGH";

  channel: NotificationChannel;
  urgency: NotificationUrgency;
  category: NotificationCategory;

  userName?: string;
  organizationName?: string;

  lastInteractionAt?: Date;
  engagementScore?: number; // 0–100

  deviceType?: "SMARTPHONE" | "FEATURE_PHONE" | "WEB";
};

/* -------------------------------------------------------------------------- */
/* PERSONALIZED MESSAGE                                                       */
/* -------------------------------------------------------------------------- */

export type PersonalizedMessage = {
  title?: string;
  body: string;
  footer?: string;
  language: string;
  tone: string;
  shortVersion?: string;
};

/* -------------------------------------------------------------------------- */
/* TEMPLATES (BASE INTENTION)                                                  */
/* -------------------------------------------------------------------------- */

const BASE_TEMPLATES: Record<
  NotificationCategory,
  Record<string, string>
> = {
  SYSTEM: {
    fr: "Notification système importante.",
    en: "Important system notification.",
    sw: "Arifa muhimu ya mfumo.",
  },
  PAYMENT: {
    fr: "Paiement reçu avec succès.",
    en: "Payment successfully received.",
    sw: "Malipo yamepokelewa.",
  },
  SECURITY: {
    fr: "Alerte de sécurité détectée.",
    en: "Security alert detected.",
    sw: "Tahadhari ya usalama.",
  },
  SOCIAL: {
    fr: "Nouvelle activité sur votre compte.",
    en: "New activity on your account.",
    sw: "Shughuli mpya kwenye akaunti yako.",
  },
};

/* -------------------------------------------------------------------------- */
/* CULTURAL ADAPTATION                                                        */
/* -------------------------------------------------------------------------- */

const CULTURAL_RULES = {
  AFRICA: {
    greeting: "Bonjour",
    respectBoost: true,
  },
  GLOBAL: {
    greeting: "Hello",
    respectBoost: false,
  },
};

/* -------------------------------------------------------------------------- */
/* ENGINE                                                                     */
/* -------------------------------------------------------------------------- */

export class PersonalizationEngine {
  /* ======================================================================== */
  /* PUBLIC API                                                               */
  /* ======================================================================== */

  static personalize(
    rawMessage: string,
    context: PersonalizationContext
  ): PersonalizedMessage {
    const language = context.language || "fr";
    const baseTemplate =
      BASE_TEMPLATES[context.category]?.[language] ??
      rawMessage;

    const tone = this.resolveTone(context);
    const greeting = this.resolveGreeting(context);

    let body = `${greeting} ${
      context.userName ?? ""
    }, ${baseTemplate} ${rawMessage}`.trim();

    /* -------------------- Literacy adaptation -------------------- */
    if (context.literacyLevel === "LOW") {
      body = this.simplify(body);
    }

    /* -------------------- Urgency emphasis ------------------------ */
    if (context.urgency === "CRITICAL") {
      body = `🚨 ${body.toUpperCase()}`;
    }

    /* -------------------- Channel formatting ---------------------- */
    if (context.channel === "SMS") {
      body = body.slice(0, 140);
    }

    if (context.channel === "PUSH") {
      body = body.slice(0, 200);
    }

    const shortVersion = body.slice(0, 60);

    return {
      title:
        context.category === "SECURITY"
          ? "⚠️ Sécurité"
          : undefined,
      body,
      footer: "— Débrouille",
      language,
      tone,
      shortVersion,
    };
  }

  /* ======================================================================== */
  /* INTERNAL                                                                 */
  /* ======================================================================== */

  private static resolveTone(
    context: PersonalizationContext
  ): string {
    if (context.urgency === "CRITICAL") {
      return "URGENT";
    }

    if (context.preferredTone) {
      return context.preferredTone;
    }

    if (
      context.engagementScore &&
      context.engagementScore < 30
    ) {
      return "FRIENDLY";
    }

    return "NEUTRAL";
  }

  private static resolveGreeting(
    context: PersonalizationContext
  ): string {
    if (context.country?.startsWith("CD")) {
      return "Bonjour";
    }

    return "Hello";
  }

  private static simplify(text: string): string {
    return text
      .replace(/important/gi, "grand")
      .replace(/notification/gi, "message");
  }
}
