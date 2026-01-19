/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE NOTIFICATION — CORE INDEX (WORLD #1 OFFICIAL ENTRYPOINT)        */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/notification/index.ts                               */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE STRATÉGIQUE :                                                        */
/*   - Point d'entrée UNIQUE du module Notification                           */
/*   - Orchestration globale (channels, IA, rules, scheduler)                 */
/*   - Initialisation déterministe                                            */
/*   - Verrouillage des invariants                                            */
/*                                                                            */
/*  AUCUN AUTRE MODULE NE DOIT IMPORTER DIRECTEMENT                            */
/*  UN CHANNEL, UN ENGINE OU UNE RULE.                                        */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { logger } from "../../shared/logger";

/* -------------------------------------------------------------------------- */
/* CORE API                                                                   */
/* -------------------------------------------------------------------------- */

import { NotificationService } from "./notification.service";
import { NotificationController } from "./notification.controller";

/* -------------------------------------------------------------------------- */
/* CHANNEL REGISTRY                                                           */
/* -------------------------------------------------------------------------- */

import { ChannelRegistry } from "./channels/channel.registry";

/* Push */
import { FcmChannel } from "./channels/push/fcm.channel";
import { ApnsChannel } from "./channels/push/apns.channel";
import { WebPushChannel } from "./channels/push/webpush.channel";

/* SMS */
import { TwilioSmsChannel } from "./channels/sms/twilio.channel";
import { AfricaTalkingSmsChannel } from "./channels/sms/africastalking.channel";
import { LocalGatewaySmsChannel } from "./channels/sms/local-gateway.channel";

/* Email */
import { SmtpEmailChannel } from "./channels/email/smtp.channel";
import { SendgridEmailChannel } from "./channels/email/sendgrid.channel";

/* Chat */
import { WhatsAppChannel } from "./channels/chat/whatsapp.channel";
import { TelegramChannel } from "./channels/chat/telegram.channel";
import { SignalChannel } from "./channels/chat/signal.channel";

/* Offline */
import { UssdChannel } from "./channels/offline/ussd.channel";
import { MeshChannel } from "./channels/offline/mesh.channel";

/* -------------------------------------------------------------------------- */
/* RULE ENGINES                                                               */
/* -------------------------------------------------------------------------- */

import { RateLimitRules } from "./rules/rate-limit.rules";
import { QuietHoursRules } from "./rules/quiet-hours.rules";
import { EscalationRules } from "./rules/escalation.rules";

/* -------------------------------------------------------------------------- */
/* INTELLIGENCE ENGINES                                                       */
/* -------------------------------------------------------------------------- */

import { RoutingEngine } from "./intelligence/routing.engine";
import { PersonalizationEngine } from "./intelligence/personalization.engine";
import { PriorityEngine } from "./intelligence/priority.engine";

/* -------------------------------------------------------------------------- */
/* SCHEDULER                                                                  */
/* -------------------------------------------------------------------------- */

import { NotificationScheduler } from "./scheduler/notification.scheduler";

/* -------------------------------------------------------------------------- */
/* CONSENT & COMPLIANCE                                                       */
/* -------------------------------------------------------------------------- */

import { ConsentService } from "./consent/consent.service";

/* -------------------------------------------------------------------------- */
/* INTERNAL STATE                                                             */
/* -------------------------------------------------------------------------- */

let initialized = false;

/* -------------------------------------------------------------------------- */
/* BOOTSTRAP                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Initialise le système de notification mondial.
 * ⚠️ Doit être appelé UNE SEULE FOIS au démarrage du serveur.
 */
export async function initializeNotificationSystem(): Promise<void> {
  if (initialized) {
    logger.warn(
      "Notification system already initialized, skipping"
    );
    return;
  }

  logger.info("🚀 Bootstrapping Notification System...");

  /* ======================================================================== */
  /* CHANNEL REGISTRATION                                                     */
  /* ======================================================================== */

  ChannelRegistry.register(new FcmChannel());
  ChannelRegistry.register(new ApnsChannel());
  ChannelRegistry.register(new WebPushChannel());

  ChannelRegistry.register(new TwilioSmsChannel());
  ChannelRegistry.register(
    new AfricaTalkingSmsChannel()
  );
  ChannelRegistry.register(
    new LocalGatewaySmsChannel()
  );

  ChannelRegistry.register(new SmtpEmailChannel());
  ChannelRegistry.register(new SendgridEmailChannel());

  ChannelRegistry.register(new WhatsAppChannel());
  ChannelRegistry.register(new TelegramChannel());
  ChannelRegistry.register(new SignalChannel());

  ChannelRegistry.register(new UssdChannel());
  ChannelRegistry.register(new MeshChannel());

  logger.info(
    `📡 ${ChannelRegistry.count()} channels registered`
  );

  /* ======================================================================== */
  /* RULE ENGINES                                                             */
  /* ======================================================================== */

  NotificationService.registerRuleEngine(
    "RATE_LIMIT",
    RateLimitRules
  );

  NotificationService.registerRuleEngine(
    "QUIET_HOURS",
    QuietHoursRules
  );

  NotificationService.registerRuleEngine(
    "ESCALATION",
    EscalationRules
  );

  logger.info("📏 Rule engines registered");

  /* ======================================================================== */
  /* INTELLIGENCE ENGINES                                                     */
  /* ======================================================================== */

  NotificationService.registerIntelligenceEngine(
    "ROUTING",
    RoutingEngine
  );

  NotificationService.registerIntelligenceEngine(
    "PERSONALIZATION",
    PersonalizationEngine
  );

  NotificationService.registerIntelligenceEngine(
    "PRIORITY",
    PriorityEngine
  );

  logger.info("🤖 Intelligence engines registered");

  /* ======================================================================== */
  /* CONSENT SYSTEM                                                           */
  /* ======================================================================== */

  await ConsentService.initialize();
  logger.info("🛡️ Consent system ready");

  /* ======================================================================== */
  /* SCHEDULER                                                                */
  /* ======================================================================== */

  NotificationScheduler.start();
  logger.info("⏱️ Scheduler started");

  /* ======================================================================== */
  /* INVARIANT VALIDATION                                                     */
  /* ======================================================================== */

  validateSystemInvariants();

  initialized = true;

  logger.info(
    "✅ Notification System fully initialized and locked"
  );
}

/* -------------------------------------------------------------------------- */
/* INVARIANT VALIDATION                                                       */
/* -------------------------------------------------------------------------- */

function validateSystemInvariants(): void {
  if (ChannelRegistry.count() === 0) {
    throw new Error(
      "Notification system boot failure: no channels registered"
    );
  }

  if (!NotificationScheduler.isRunning()) {
    throw new Error(
      "Notification system boot failure: scheduler not running"
    );
  }

  logger.info("🔒 System invariants validated");
}

/* -------------------------------------------------------------------------- */
/* PUBLIC API EXPORTS                                                         */
/* -------------------------------------------------------------------------- */

export const NotificationAPI = Object.freeze({
  initialize: initializeNotificationSystem,
  service: NotificationService,
  controller: NotificationController,
});

/* -------------------------------------------------------------------------- */
/* AUTO-BOOT (OPTIONAL)                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Si tu veux auto-initialiser dès import
 * (microservices / workers dédiés).
 */
// initializeNotificationSystem().catch(console.error);
