/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE PAY — FRAUD EVENTS BUS (GLOBAL STREAMING CORE)                  */
/*  File: backend/src/core/pay/fraud.events.ts                                */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*  - Diffuser tous les événements antifraude                                 */
/*  - Garantir idempotence, traçabilité, observabilité                         */
/*  - Supporter Webhooks, Queues, IA, BI, Justice                              */
/*  - Être extensible sans casser l’existant                                   */
/*                                                                            */
/*  PRINCIPES NON NÉGOCIABLES :                                                */
/*  - Aucun événement critique perdu                                          */
/*  - Aucun listener ne bloque le flux                                         */
/*  - Tous les payloads sont typés                                             */
/*  - Compatible streaming distribué                                          */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { EventEmitter } from "events";
import crypto from "crypto";

import {
  FraudSignal,
  FraudScore,
  FraudDecisionResult,
  FraudCaseFile,
  FraudInvestigation,
  FraudResolution,
} from "./fraud.types";

/* -------------------------------------------------------------------------- */
/* EVENT METADATA                                                             */
/* -------------------------------------------------------------------------- */

export interface FraudEventMeta {
  eventId: string;
  eventName: FraudEventName;
  emittedAt: Date;
  correlationId?: string;
  source: "CORE" | "AI" | "EXTERNAL" | "SYSTEM";
  version: number;
}

/* -------------------------------------------------------------------------- */
/* EVENT PAYLOAD MAP (SOURCE OF TRUTH)                                        */
/* -------------------------------------------------------------------------- */

export interface FraudEventMap {
  /* SIGNALS */
  "fraud.signal.detected": {
    identityId: string;
    signal: FraudSignal;
  };

  /* SCORING */
  "fraud.score.updated": {
    identityId: string;
    score: FraudScore;
  };

  /* DECISION */
  "fraud.decision.made": {
    identityId: string;
    decision: FraudDecisionResult;
  };

  /* CASE */
  "fraud.case.created": {
    caseFile: FraudCaseFile;
  };

  /* INVESTIGATION */
  "fraud.investigation.opened": {
    investigation: FraudInvestigation;
    identityId: string;
  };

  "fraud.investigation.closed": {
    investigationId: string;
    resolution: FraudResolution;
    identityId: string;
  };

  /* ERRORS */
  "fraud.event.error": {
    event: string;
    error: unknown;
    payload?: unknown;
    at: Date;
  };
}

/* -------------------------------------------------------------------------- */
/* EVENT NAMES                                                                */
/* -------------------------------------------------------------------------- */

export type FraudEventName = keyof FraudEventMap;

/* -------------------------------------------------------------------------- */
/* SAFE EVENT WRAPPER                                                         */
/* -------------------------------------------------------------------------- */

const safe =
  <T>(handler: (payload: T, meta: FraudEventMeta) => Promise<void> | void) =>
  async (payload: T, meta: FraudEventMeta): Promise<void> => {
    try {
      await handler(payload, meta);
    } catch (error) {
      fraudEventBus.emitSafe("fraud.event.error", {
        event: meta.eventName,
        error,
        payload,
        at: new Date(),
      });
    }
  };

/* -------------------------------------------------------------------------- */
/* INTERNAL UTILITIES                                                         */
/* -------------------------------------------------------------------------- */

const generateEventId = () =>
  crypto.randomBytes(16).toString("hex");

/* -------------------------------------------------------------------------- */
/* FRAUD EVENT BUS                                                            */
/* -------------------------------------------------------------------------- */

class FraudEventBus extends EventEmitter {
  emitSafe<E extends FraudEventName>(
    event: E,
    payload: FraudEventMap[E],
    meta?: Partial<FraudEventMeta>
  ) {
    const fullMeta: FraudEventMeta = {
      eventId: generateEventId(),
      eventName: event,
      emittedAt: new Date(),
      source: meta?.source || "CORE",
      correlationId: meta?.correlationId,
      version: meta?.version || 1,
    };

    try {
      this.emit(event, payload, fullMeta);
    } catch (error) {
      this.emit("fraud.event.error", {
        event,
        error,
        payload,
        at: new Date(),
      });
    }
  }

  onSafe<E extends FraudEventName>(
    event: E,
    handler: (
      payload: FraudEventMap[E],
      meta: FraudEventMeta
    ) => Promise<void> | void
  ) {
    this.on(event, safe(handler));
  }
}

export const fraudEventBus = new FraudEventBus();

/* -------------------------------------------------------------------------- */
/* WEBHOOK REGISTRY (OPTIONNEL MAIS PRÊT)                                     */
/* -------------------------------------------------------------------------- */

type WebhookHandler = (
  event: FraudEventName,
  payload: unknown,
  meta: FraudEventMeta
) => Promise<void>;

const webhookRegistry = new Set<WebhookHandler>();

export function registerFraudWebhook(
  handler: WebhookHandler
) {
  webhookRegistry.add(handler);
}

async function dispatchWebhooks(
  event: FraudEventName,
  payload: unknown,
  meta: FraudEventMeta
) {
  for (const handler of webhookRegistry) {
    try {
      await handler(event, payload, meta);
    } catch {
      // 🔇 volontairement silencieux (non bloquant)
    }
  }
}

/* -------------------------------------------------------------------------- */
/* STREAM BRIDGE (KAFKA / NATS READY)                                          */
/* -------------------------------------------------------------------------- */

export interface FraudStreamAdapter {
  publish(
    topic: string,
    payload: unknown,
    meta: FraudEventMeta
  ): Promise<void>;
}

let streamAdapter: FraudStreamAdapter | null = null;

export function registerFraudStreamAdapter(
  adapter: FraudStreamAdapter
) {
  streamAdapter = adapter;
}

async function dispatchStream(
  event: FraudEventName,
  payload: unknown,
  meta: FraudEventMeta
) {
  if (!streamAdapter) return;

  try {
    await streamAdapter.publish(
      `fraud.${event}`,
      payload,
      meta
    );
  } catch {
    // 🔇 jamais bloquer
  }
}

/* -------------------------------------------------------------------------- */
/* GLOBAL DISPATCH HOOK                                                       */
/* -------------------------------------------------------------------------- */

function attachGlobalDispatcher() {
  const allEvents: FraudEventName[] = [
    "fraud.signal.detected",
    "fraud.score.updated",
    "fraud.decision.made",
    "fraud.case.created",
    "fraud.investigation.opened",
    "fraud.investigation.closed",
  ];

  for (const event of allEvents) {
    fraudEventBus.on(event, async (payload, meta) => {
      await Promise.all([
        dispatchWebhooks(event, payload, meta),
        dispatchStream(event, payload, meta),
      ]);
    });
  }
}

attachGlobalDispatcher();

/* -------------------------------------------------------------------------- */
/* EVENT HELPERS (DX ULTRA SIMPLE)                                             */
/* -------------------------------------------------------------------------- */

export const FraudEvents = {
  signalDetected(
    payload: FraudEventMap["fraud.signal.detected"]
  ) {
    fraudEventBus.emitSafe("fraud.signal.detected", payload);
  },

  scoreUpdated(
    payload: FraudEventMap["fraud.score.updated"]
  ) {
    fraudEventBus.emitSafe("fraud.score.updated", payload);
  },

  decisionMade(
    payload: FraudEventMap["fraud.decision.made"]
  ) {
    fraudEventBus.emitSafe("fraud.decision.made", payload);
  },

  caseCreated(
    payload: FraudEventMap["fraud.case.created"]
  ) {
    fraudEventBus.emitSafe("fraud.case.created", payload);
  },

  investigationOpened(
    payload: FraudEventMap["fraud.investigation.opened"]
  ) {
    fraudEventBus.emitSafe(
      "fraud.investigation.opened",
      payload
    );
  },

  investigationClosed(
    payload: FraudEventMap["fraud.investigation.closed"]
  ) {
    fraudEventBus.emitSafe(
      "fraud.investigation.closed",
      payload
    );
  },
};

/* -------------------------------------------------------------------------- */
/* OBSERVABILITY HOOKS (OPTIONNEL)                                             */
/* -------------------------------------------------------------------------- */

export function enableFraudConsoleDebug() {
  fraudEventBus.onSafe(
    "fraud.signal.detected",
    async (payload, meta) => {
      console.log("🛰️ Fraud signal", payload, meta);
    }
  );

  fraudEventBus.onSafe(
    "fraud.decision.made",
    async (payload, meta) => {
      console.log("⚖️ Fraud decision", payload, meta);
    }
  );

  fraudEventBus.onSafe(
    "fraud.case.created",
    async (payload, meta) => {
      console.log("📁 Fraud case opened", payload, meta);
    }
  );
}
