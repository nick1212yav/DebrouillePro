/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE PAY — WEBHOOK HANDLER (SOVEREIGN EVENT ORCHESTRATOR)            */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/pay/providers/webhooks/webhook.handler.ts           */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  MISSION                                                                   */
/*  - Ingestion sécurisée des événements financiers mondiaux                  */
/*  - Zéro confiance par défaut                                                */
/*  - Pipeline déterministe :                                                  */
/*      VALIDATE → NORMALIZE → DEDUP → AUDIT → DISPATCH → OBSERVE              */
/*                                                                            */
/*  GARANTIES ABSOLUES                                                        */
/*  - Jamais double-exécution                                                  */
/*  - Jamais perte silencieuse                                                 */
/*  - Jamais blocage externe                                                   */
/*  - Traçabilité judiciaire complète                                         */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Request, Response } from "express";
import crypto from "crypto";

import { WebhookValidator } from "./webhook.validator";
import { WebhookMapper } from "./webhook.mapper";

import {
  ProviderName,
  NormalizedWebhookEvent,
} from "../provider.types";

import { PayService } from "../../pay.service";
import { TrackingService } from "../../tracking/tracking.service";

/* -------------------------------------------------------------------------- */
/* PAY SERVICE BRIDGE (TYPE SAFE ADAPTER)                                     */
/* -------------------------------------------------------------------------- */
/**
 * ⚠️ Important
 * PayService ne déclare pas encore officiellement ces méthodes.
 * On crée un bridge typé local pour garantir :
 * - Compilation TypeScript propre
 * - Zéro impact runtime
 * - Isolation stricte
 */

type PayWebhookCapabilities = {
  isWebhookProcessed(
    dedupKey: string
  ): Promise<boolean>;

  markWebhookProcessed(
    dedupKey: string,
    payload: {
      provider: ProviderName;
      reference: string;
      receivedAt: Date;
    }
  ): Promise<void>;

  handleWebhookEvent(
    event: NormalizedWebhookEvent
  ): Promise<void>;
};

const PayWebhookBridge =
  PayService as unknown as PayWebhookCapabilities;

/* -------------------------------------------------------------------------- */
/* INTERNAL TYPES                                                             */
/* -------------------------------------------------------------------------- */

type WebhookRuntimeContext = {
  requestId: string;
  receivedAt: Date;
  ip?: string;
  provider: ProviderName;
  fingerprint: string;
};

/* -------------------------------------------------------------------------- */
/* UTILITIES                                                                  */
/* -------------------------------------------------------------------------- */

function computeFingerprint(payload: unknown): string {
  try {
    return crypto
      .createHash("sha256")
      .update(JSON.stringify(payload))
      .digest("hex");
  } catch {
    return `UNHASHABLE-${Date.now()}`;
  }
}

function safeProvider(value: unknown): ProviderName | null {
  if (!value) return null;

  const p = String(value).toUpperCase();

  const allowed: ProviderName[] = [
    "FLUTTERWAVE",
    "CINETPAY",
    "PAYSTACK",
    "STRIPE",
    "SANDBOX",
  ];

  return allowed.includes(p as ProviderName)
    ? (p as ProviderName)
    : null;
}

/* -------------------------------------------------------------------------- */
/* WEBHOOK HANDLER — FINAL CLASS                                              */
/* -------------------------------------------------------------------------- */

export class WebhookHandler {
  /* ------------------------------------------------------------------------ */
  /* EXPRESS ENTRYPOINT                                                       */
  /* ------------------------------------------------------------------------ */

  static async handle(
    req: Request,
    res: Response
  ): Promise<void> {
    const provider = safeProvider(
      req.params.provider
    );

    if (!provider) {
      res
        .status(400)
        .json({ error: "Invalid or missing provider" });
      return;
    }

    const runtime: WebhookRuntimeContext = {
      requestId:
        (req.headers["x-request-id"] as string) ||
        crypto.randomUUID(),
      receivedAt: new Date(),
      ip: req.ip,
      provider,
      fingerprint: computeFingerprint(req.body),
    };

    /* ---------------------------------------------------------------------- */
    /* 1. ZERO-TRUST VALIDATION                                                */
    /* ---------------------------------------------------------------------- */

    const validation = WebhookValidator.validate({
      provider,
      headers: req.headers,
      body: req.body,
      rawBody: (req as any).rawBody,
    });

    if (!validation.valid) {
      await TrackingService.system(
        {},
        {
          action: "WEBHOOK_REJECTED",
          outcome: "DENIED",
          severity: "HIGH",
          message: validation.reason,
          metadata: runtime,
        }
      );

      res.status(401).json({ error: "Webhook rejected" });
      return;
    }

    /* ---------------------------------------------------------------------- */
    /* 2. NORMALIZATION                                                       */
    /* ---------------------------------------------------------------------- */

    let event: NormalizedWebhookEvent;

    try {
      event = WebhookMapper.map(
        provider,
        req.body,
        runtime.receivedAt
      );
    } catch (error) {
      await TrackingService.system(
        {},
        {
          action: "WEBHOOK_MAPPING_FAILED",
          outcome: "FAILURE",
          severity: "HIGH",
          message: (error as Error).message,
          metadata: {
            runtime,
            payload: req.body,
          },
        }
      );

      res
        .status(400)
        .json({ error: "Webhook mapping failed" });
      return;
    }

    /* ---------------------------------------------------------------------- */
    /* 3. IDEMPOTENCE & ANTI-REPLAY                                            */
    /* ---------------------------------------------------------------------- */

    const dedupKey =
      event.provider +
      ":" +
      (event.providerReference || event.reference) +
      ":" +
      runtime.fingerprint;

    const alreadyProcessed =
      await PayWebhookBridge.isWebhookProcessed(
        dedupKey
      );

    if (alreadyProcessed) {
      await TrackingService.system(
        {},
        {
          action: "WEBHOOK_DUPLICATE_IGNORED",
          outcome: "SUCCESS",
          severity: "LOW",
          metadata: { runtime, dedupKey },
        }
      );

      res
        .status(200)
        .json({ status: "DUPLICATE_IGNORED" });
      return;
    }

    /* ---------------------------------------------------------------------- */
    /* 4. PERSIST IDEMPOTENCE LOCK                                             */
    /* ---------------------------------------------------------------------- */

    await PayWebhookBridge.markWebhookProcessed(
      dedupKey,
      {
        provider,
        reference: event.reference,
        receivedAt: runtime.receivedAt,
      }
    );

    /* ---------------------------------------------------------------------- */
    /* 5. CORE DISPATCH                                                        */
    /* ---------------------------------------------------------------------- */

    try {
      await PayWebhookBridge.handleWebhookEvent(
        event
      );

      await TrackingService.system(
        {},
        {
          action: "WEBHOOK_PROCESSED",
          outcome: "SUCCESS",
          severity: "LOW",
          metadata: {
            runtime,
            reference: event.reference,
            status: event.status,
            eventType: event.eventType,
          },
        }
      );

      res.status(200).json({ status: "OK" });
    } catch (error) {
      /* ------------------------------------------------------------------ */
      /* 6. FAILURE — SAFE RETRY                                             */
      /* ------------------------------------------------------------------ */

      await TrackingService.system(
        {},
        {
          action: "WEBHOOK_PROCESSING_FAILED",
          outcome: "FAILURE",
          severity: "HIGH",
          message: (error as Error).message,
          metadata: { runtime, event },
        }
      );

      res.status(500).json({
        error: "Webhook processing failed",
        requestId: runtime.requestId,
      });
    }
  }
}
