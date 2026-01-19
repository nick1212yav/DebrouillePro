/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE PAY — WEBHOOK MAPPER (UNIVERSAL NORMALIZATION ENGINE)           */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/pay/providers/webhooks/webhook.mapper.ts            */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  OBJECTIFS                                                                 */
/*  - Transformer des payloads hétérogènes en vérité financière unique        */
/*  - Résister aux changements API providers                                  */
/*  - Garantir déterminisme, auditabilité, explicabilité                       */
/*  - Supporter paiements, refunds, annulations, disputes                      */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import crypto from "crypto";
import {
  NormalizedWebhookEvent,
  NormalizedPaymentStatus,
  ProviderName,
} from "../provider.types";

/* -------------------------------------------------------------------------- */
/* INTERNAL TYPES                                                             */
/* -------------------------------------------------------------------------- */

type MappingContext = {
  provider: ProviderName;
  payload: unknown;
  receivedAt: Date;
};

/* -------------------------------------------------------------------------- */
/* SAFE UTILITIES                                                             */
/* -------------------------------------------------------------------------- */

function safeNumber(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function safeString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0
    ? value
    : undefined;
}

function safeObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object") {
    return value as Record<string, unknown>;
  }
  return {};
}

function fingerprint(payload: unknown): string {
  try {
    return crypto
      .createHash("sha256")
      .update(JSON.stringify(payload))
      .digest("hex");
  } catch {
    return "UNHASHABLE";
  }
}

/* -------------------------------------------------------------------------- */
/* MAIN MAPPER                                                                */
/* -------------------------------------------------------------------------- */

export class WebhookMapper {
  /* ------------------------------------------------------------------------ */
  /* ENTRYPOINT                                                               */
  /* ------------------------------------------------------------------------ */

  static map(
    provider: ProviderName,
    payload: unknown,
    receivedAt: Date = new Date()
  ): NormalizedWebhookEvent {
    const ctx: MappingContext = {
      provider,
      payload,
      receivedAt,
    };

    const event =
      provider === "FLUTTERWAVE"
        ? this.mapFlutterwave(ctx)
        : provider === "CINETPAY"
        ? this.mapCinetPay(ctx)
        : provider === "PAYSTACK"
        ? this.mapPaystack(ctx)
        : provider === "STRIPE"
        ? this.mapStripe(ctx)
        : provider === "SANDBOX"
        ? this.mapSandbox(ctx)
        : this.unsupported(provider);

    return this.enrich(event, ctx);
  }

  /* ------------------------------------------------------------------------ */
  /* PROVIDER MAPPERS                                                         */
  /* ------------------------------------------------------------------------ */

  private static mapFlutterwave(
    ctx: MappingContext
  ): NormalizedWebhookEvent {
    const d = safeObject((ctx.payload as any)?.data);

    return {
      provider: "FLUTTERWAVE",
      eventType: this.resolveEventType((d as any).status),
      reference: safeString((d as any).tx_ref) ?? "UNKNOWN",
      providerReference: safeString((d as any).id),
      status: this.normalizeStatus((d as any).status),
      amount: safeNumber((d as any).amount),
      currency: safeString((d as any).currency)?.toUpperCase(),
      raw: ctx.payload,
      receivedAt: ctx.receivedAt,
    };
  }

  private static mapCinetPay(
    ctx: MappingContext
  ): NormalizedWebhookEvent {
    const p = safeObject(ctx.payload);

    return {
      provider: "CINETPAY",
      eventType: this.resolveEventType((p as any).status),
      reference:
        safeString((p as any).transaction_id) ?? "UNKNOWN",
      providerReference: safeString((p as any).payment_id),
      status: this.normalizeStatus((p as any).status),
      amount: safeNumber((p as any).amount),
      currency: safeString((p as any).currency)?.toUpperCase(),
      raw: ctx.payload,
      receivedAt: ctx.receivedAt,
    };
  }

  private static mapPaystack(
    ctx: MappingContext
  ): NormalizedWebhookEvent {
    const d = safeObject((ctx.payload as any)?.data);

    const amount = safeNumber((d as any).amount);

    return {
      provider: "PAYSTACK",
      eventType: this.resolveEventType((d as any).status),
      reference: safeString((d as any).reference) ?? "UNKNOWN",
      providerReference: safeString((d as any).id),
      status: this.normalizeStatus((d as any).status),
      amount: amount !== undefined ? amount / 100 : undefined,
      currency: safeString((d as any).currency)?.toUpperCase(),
      raw: ctx.payload,
      receivedAt: ctx.receivedAt,
    };
  }

  private static mapStripe(
    ctx: MappingContext
  ): NormalizedWebhookEvent {
    const obj = safeObject(
      (ctx.payload as any)?.data?.object
    );

    const amount = safeNumber(
      (obj as any).amount_received
    );

    return {
      provider: "STRIPE",
      eventType: this.resolveEventType((obj as any).status),
      reference:
        safeString((obj as any)?.metadata?.reference) ??
        "UNKNOWN",
      providerReference: safeString((obj as any).id),
      status: this.normalizeStatus((obj as any).status),
      amount: amount !== undefined ? amount / 100 : undefined,
      currency: safeString((obj as any).currency)?.toUpperCase(),
      raw: ctx.payload,
      receivedAt: ctx.receivedAt,
    };
  }

  private static mapSandbox(
    ctx: MappingContext
  ): NormalizedWebhookEvent {
    const p = safeObject(ctx.payload);

    return {
      provider: "SANDBOX",
      eventType: this.resolveEventType((p as any).status),
      reference:
        safeString((p as any).reference) ?? "SANDBOX",
      providerReference: safeString(
        (p as any).providerReference
      ),
      status: this.normalizeStatus((p as any).status),
      amount: safeNumber((p as any).amount),
      currency: safeString((p as any).currency)?.toUpperCase(),
      raw: ctx.payload,
      receivedAt: ctx.receivedAt,
    };
  }

  /* ------------------------------------------------------------------------ */
  /* CORE NORMALIZATION LOGIC                                                  */
  /* ------------------------------------------------------------------------ */

  private static normalizeStatus(
    status: unknown
  ): NormalizedPaymentStatus {
    if (!status) return "FAILED";

    const s = String(status).toLowerCase();

    if (
      [
        "success",
        "successful",
        "succeeded",
        "completed",
        "accepted",
      ].includes(s)
    )
      return "SUCCESS";

    if (["pending", "processing", "queued"].includes(s))
      return "PENDING";

    if (["refund", "refunded"].includes(s))
      return "REFUNDED";

    if (["cancel", "cancelled", "canceled"].includes(s))
      return "CANCELLED";

    return "FAILED";
  }

  private static resolveEventType(
    status: unknown
  ): NormalizedWebhookEvent["eventType"] {
    const s = String(status || "").toLowerCase();

    if (["refund", "refunded"].includes(s))
      return "REFUND_SUCCESS";

    if (["failed", "error"].includes(s))
      return "PAYMENT_FAILED";

    if (["pending", "processing"].includes(s))
      return "PAYMENT_CREATED";

    if (
      [
        "success",
        "successful",
        "succeeded",
        "completed",
        "accepted",
      ].includes(s)
    )
      return "PAYMENT_SUCCESS";

    return "PAYMENT_FAILED";
  }

  /* ------------------------------------------------------------------------ */
  /* ENRICHMENT                                                               */
  /* ------------------------------------------------------------------------ */

  private static enrich(
    event: NormalizedWebhookEvent,
    ctx: MappingContext
  ): NormalizedWebhookEvent {
    const rawObject = safeObject(event.raw);

    return {
      ...event,
      raw: {
        ...rawObject,
        __meta: {
          provider: ctx.provider,
          receivedAt: ctx.receivedAt.toISOString(),
          fingerprint: fingerprint(ctx.payload),
        },
      },
    };
  }

  /* ------------------------------------------------------------------------ */
  /* FAIL FAST                                                                */
  /* ------------------------------------------------------------------------ */

  private static unsupported(
    provider: ProviderName
  ): never {
    throw new Error(
      `[WebhookMapper] Unsupported provider: ${provider}`
    );
  }
}
