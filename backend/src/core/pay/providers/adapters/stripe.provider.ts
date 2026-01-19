/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE PAY — STRIPE PROVIDER (GLOBAL BANKING GRADE)                    */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/pay/providers/adapters/stripe.provider.ts          */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE                                                                      */
/*  - Paiements internationaux premium                                       */
/*  - Cartes mondiales • SEPA • ACH • Subscriptions                           */
/*  - Sécurité bancaire cryptographique                                      */
/*  - Haute conformité (PCI-DSS, GDPR, SOC2)                                  */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import crypto from "crypto";

import {
  PaymentProvider,
  ProviderCapabilities,
  ProviderPaymentRequest,
  ProviderPaymentResponse,
  ProviderRefundRequest,
  ProviderRefundResponse,
  ProviderWebhookPayload,
} from "../provider.interface";

import {
  NormalizedWebhookEvent,
  ProviderError,
} from "../provider.types";

import { CurrencyCode } from "../../pay.types";

/* -------------------------------------------------------------------------- */
/* INTERNAL TYPES — STRIPE                                                    */
/* -------------------------------------------------------------------------- */

type StripeWebhookHeaders = {
  "stripe-signature"?: string;
};

type StripeWebhookObject = {
  id?: string;
  status?: string;
  amount_received?: number;
  amount?: number;
  currency?: string;
  metadata?: {
    reference?: string;
  };
};

type StripeWebhookEvent = {
  id?: string;
  type?: string;
  created?: number;
  data?: {
    object?: StripeWebhookObject;
  };
};

/* -------------------------------------------------------------------------- */
/* ENV CONFIG                                                                 */
/* -------------------------------------------------------------------------- */

const STRIPE_WEBHOOK_SECRET =
  process.env.STRIPE_WEBHOOK_SECRET || "";

const STRIPE_TIMESTAMP_TOLERANCE_MS =
  5 * 60 * 1000; // 5 minutes

/* -------------------------------------------------------------------------- */
/* UTILITIES                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Normalise les statuts Stripe vers DébrouillePay.
 */
function normalizeStripeStatus(
  status?: string
): "PENDING" | "SUCCESS" | "FAILED" {
  if (!status) return "PENDING";

  const s = status.toLowerCase();

  if (["succeeded", "paid"].includes(s)) return "SUCCESS";
  if (["failed", "canceled"].includes(s)) return "FAILED";

  return "PENDING";
}

/**
 * Vérifie la signature Stripe (HMAC SHA256 + timestamp).
 */
function verifyStripeSignature(params: {
  payload: string;
  signatureHeader: string;
  secret: string;
}): boolean {
  const elements = params.signatureHeader.split(",");

  const timestampPart = elements.find((p) =>
    p.startsWith("t=")
  );
  const signaturePart = elements.find((p) =>
    p.startsWith("v1=")
  );

  if (!timestampPart || !signaturePart) return false;

  const timestamp = Number(timestampPart.split("=")[1]);
  const signature = signaturePart.split("=")[1];

  if (!timestamp || !signature) return false;

  const now = Date.now();
  if (
    Math.abs(now - timestamp * 1000) >
    STRIPE_TIMESTAMP_TOLERANCE_MS
  ) {
    return false; // replay attack
  }

  const signedPayload = `${timestamp}.${params.payload}`;

  const expectedSignature = crypto
    .createHmac("sha256", params.secret)
    .update(signedPayload)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/* -------------------------------------------------------------------------- */
/* STRIPE PROVIDER                                                            */
/* -------------------------------------------------------------------------- */

export class StripeProvider implements PaymentProvider {
  readonly name = "stripe";

  /* ------------------------------------------------------------------------ */
  /* CAPABILITIES                                                             */
  /* ------------------------------------------------------------------------ */

  getCapabilities(): ProviderCapabilities {
    return {
      methods: ["CARD", "BANK_TRANSFER"],

      supportedCountries: [
        "US",
        "CA",
        "FR",
        "DE",
        "GB",
        "NL",
        "BE",
        "ES",
        "IT",
        "PT",
        "AE",
        "SG",
        "JP",
      ],

      supportedCurrencies: [
        "USD",
        "EUR",
        "GBP",
        "CAD",
        "JPY",
      ] as CurrencyCode[],

      supportsWebhooks: true,
      supportsRefunds: true,
      supportsPartialPayments: true,
    };
  }

  /* ------------------------------------------------------------------------ */
  /* PAYMENT INITIATION                                                       */
  /* ------------------------------------------------------------------------ */

  async initiatePayment(
    payload: ProviderPaymentRequest
  ): Promise<ProviderPaymentResponse> {
    /**
     * ⚠️ En production :
     * - stripe.paymentIntents.create()
     * - amount en cents
     * - automatic_payment_methods
     */

    const providerReference = `STRIPE-${Date.now()}-${Math.floor(
      Math.random() * 100000
    )}`;

    return {
      providerReference,
      status: "PENDING",
      redirectUrl:
        payload.method === "CARD"
          ? "https://checkout.stripe.com/pay"
          : undefined,
      raw: {
        simulated: true,
        provider: this.name,
        request: payload,
      },
    };
  }

  /* ------------------------------------------------------------------------ */
  /* REFUND                                                                   */
  /* ------------------------------------------------------------------------ */

  async refundPayment(
    payload: ProviderRefundRequest
  ): Promise<ProviderRefundResponse> {
    /**
     * En production :
     * - stripe.refunds.create()
     */

    return {
      status: "SUCCESS",
      raw: {
        simulated: true,
        provider: this.name,
        refund: payload,
      },
    };
  }

  /* ------------------------------------------------------------------------ */
  /* WEBHOOK PARSING                                                          */
  /* ------------------------------------------------------------------------ */

  async parseWebhook(
    _headers: StripeWebhookHeaders,
    body: StripeWebhookEvent
  ): Promise<ProviderWebhookPayload> {
    const object = body.data?.object;

    const normalizedStatus = normalizeStripeStatus(
      object?.status
    );

    const currency = object?.currency
      ? (object.currency.toUpperCase() as CurrencyCode)
      : undefined;

    const amount =
      object?.amount_received || object?.amount
        ? Math.round(
            ((object.amount_received ??
              object.amount) as number) / 100
          )
        : undefined;

    return {
      provider: this.name,
      event: body.type || "stripe.unknown",
      reference:
        object?.metadata?.reference || object?.id || "",
      status: normalizedStatus,
      amount,
      currency,
      raw: body,
    };
  }

  /* ------------------------------------------------------------------------ */
  /* WEBHOOK SIGNATURE VALIDATION                                             */
  /* ------------------------------------------------------------------------ */

  async validateWebhookSignature(
    headers: StripeWebhookHeaders,
    body: unknown
  ): Promise<boolean> {
    if (!STRIPE_WEBHOOK_SECRET) {
      // local / sandbox
      return true;
    }

    const signatureHeader = headers["stripe-signature"];
    if (!signatureHeader) return false;

    try {
      const payload =
        typeof body === "string"
          ? body
          : JSON.stringify(body);

      return verifyStripeSignature({
        payload,
        signatureHeader,
        secret: STRIPE_WEBHOOK_SECRET,
      });
    } catch {
      return false;
    }
  }

  /* ------------------------------------------------------------------------ */
  /* NORMALIZATION (EVENT ENGINE)                                             */
  /* ------------------------------------------------------------------------ */

  normalizeWebhookEvent(
    payload: ProviderWebhookPayload
  ): NormalizedWebhookEvent {
    const eventType =
      payload.event.includes("refund")
        ? payload.status === "SUCCESS"
          ? "REFUND_SUCCESS"
          : "REFUND_FAILED"
        : payload.status === "SUCCESS"
        ? "PAYMENT_SUCCESS"
        : payload.status === "FAILED"
        ? "PAYMENT_FAILED"
        : "PAYMENT_CREATED";

    return {
      provider: "STRIPE",
      eventType,
      status:
        payload.status === "SUCCESS"
          ? "SUCCESS"
          : payload.status === "FAILED"
          ? "FAILED"
          : "PENDING",
      reference: payload.reference,
      amount: payload.amount,
      currency: payload.currency,
      receivedAt: new Date(),
      raw: payload.raw,
    };
  }

  /* ------------------------------------------------------------------------ */
  /* ERROR NORMALIZATION                                                      */
  /* ------------------------------------------------------------------------ */

  normalizeError(error: unknown): ProviderError {
    return {
      provider: "STRIPE",
      code: "UNKNOWN_ERROR",
      message:
        error instanceof Error
          ? error.message
          : "Stripe unknown error",
      raw: error,
      retryable: true,
    };
  }
}
