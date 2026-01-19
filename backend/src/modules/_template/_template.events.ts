/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE — MODULE TEMPLATE EVENTS (OFFICIAL & FINAL)                    */
/* -------------------------------------------------------------------------- */
/*  Chemin : backend/src/modules/_template/_template.events.ts                */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE STRATÉGIQUE                                                          */
/*  - Pont ENTRE le module et le Core                                         */
/*  - Aucune logique métier ici                                               */
/*  - Déclenche :                                                            */
/*      • Tracking (audit)                                                    */
/*      • Pay (si nécessaire)                                                 */
/*      • AI (analyse / recommandation)                                       */
/*                                                                            */
/*  CE FICHIER DÉFINIT COMMENT UN MODULE                                      */
/*  COMMUNIQUE AVEC LE SYSTÈME GLOBAL                                         */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  TemplateEventPayload,
  TemplateEventType,
} from "./_template.types";

/* -------------------------------------------------------------------------- */
/* IMPORTS CORE (OFFICIELS, STABLES)                                          */
/* -------------------------------------------------------------------------- */

import { TrackingService } from "../../core/tracking/tracking.service";
import { PayService } from "../../core/pay/pay.service";
import { AIService } from "../../core/ai/ai.service";

/* -------------------------------------------------------------------------- */
/* EVENTS — CLASSE FINALE                                                     */
/* -------------------------------------------------------------------------- */

export class TemplateEvents {
  /* ------------------------------------------------------------------------ */
  /* DISPATCH GÉNÉRAL                                                         */
  /* ------------------------------------------------------------------------ */

  static async dispatch(payload: TemplateEventPayload): Promise<void> {
    await this.track(payload);
    await this.notifyAI(payload);
  }

  /* ------------------------------------------------------------------------ */
  /* TRACKING / AUDIT                                                         */
  /* ------------------------------------------------------------------------ */

  private static async track(
    payload: TemplateEventPayload
  ): Promise<void> {
    await TrackingService.logEvent({
      type: payload.type,
      module: "_template",
      entityId: payload.entityId,
      actorId: payload.actorId,
      metadata: payload.metadata,
      occurredAt: payload.occurredAt,
    });
  }

  /* ------------------------------------------------------------------------ */
  /* AI — ANALYSE / RECOMMANDATION                                            */
  /* ------------------------------------------------------------------------ */

  private static async notifyAI(
    payload: TemplateEventPayload
  ): Promise<void> {
    await AIService.ingestEvent({
      source: "MODULE",
      module: "_template",
      eventType: payload.type,
      entityId: payload.entityId,
      actorId: payload.actorId,
      metadata: payload.metadata,
      timestamp: payload.occurredAt,
    });
  }

  /* ------------------------------------------------------------------------ */
  /* EXTENSION FUTURE : PAY                                                   */
  /* ------------------------------------------------------------------------ */
  /**
   * Exemple (non utilisé par le template) :
   *
   * static async triggerPayment(...) {
   *   await PayService.createEscrow(...)
   * }
   *
   * 👉 Tous les modules utiliseront CE PATTERN
   */
}
