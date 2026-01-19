/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE PAY — SANDBOX PROVIDER (UNIVERSAL SIMULATION ENGINE)            */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/pay/providers/adapters/sandbox.provider.ts          */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE                                                                      */
/*  - Moteur de simulation financière universel                               */
/*  - Reproduit opérateurs africains + cartes + banques                        */
/*  - Tests QA • Chaos engineering • Démo commerciale                          */
/*  - 100 % offline • déterministe • reproductible                             */
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
/* SANDBOX INTERNAL TYPES                                                     */
/* -------------------------------------------------------------------------- */

type SandboxOperator =
  | "ORANGE"
  | "AIRTEL"
  | "VODACOM"
  | "MTN"
  | "MOOV"
  | "WAVE"
  | "CARD"
  | "BANK";

type SandboxScenario =
  | "SUCCESS"
  | "FAILED"
  | "TIMEOUT"
  | "FRAUD"
  | "CANCELLED"
  | "PARTIAL_REFUND"
  | "NETWORK_FLAP";

interface SandboxExecutionContext {
  operator: SandboxOperator;
  scenario: SandboxScenario;
  latencyMs: number;
  deterministicSeed: string;
}

/* -------------------------------------------------------------------------- */
/* SANDBOX CONFIG                                                             */
/* -------------------------------------------------------------------------- */

const DEFAULT_LATENCY_MS = 350;
const MAX_LATENCY_MS = 3_000;

/* -------------------------------------------------------------------------- */
/* UTILITIES                                                                  */
/* -------------------------------------------------------------------------- */

function hashSeed(seed: string): number {
  return parseInt(
    crypto.createHash("md5").update(seed).digest("hex").slice(0, 8),
    16
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function selectDeterministicScenario(seed: string): SandboxScenario {
  const value = hashSeed(seed) % 100;

  if (value < 70) return "SUCCESS";
  if (value < 80) return "FAILED";
  if (value < 85) return "TIMEOUT";
  if (value < 90) return "FRAUD";
  if (value < 95) return "CANCELLED";
  return "NETWORK_FLAP";
}

function normalizeStatus(
  scenario: SandboxScenario
): "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED" {
  if (scenario === "SUCCESS") return "SUCCESS";
  if (scenario === "CANCELLED") return "CANCELLED";
  if (scenario === "TIMEOUT") return "PENDING";
  return "FAILED";
}

/* -------------------------------------------------------------------------- */
/* SANDBOX PROVIDER                                                           */
/* -------------------------------------------------------------------------- */

export class SandboxProvider implements PaymentProvider {
  readonly name = "sandbox";

  /* ------------------------------------------------------------------------ */
  /* CAPABILITIES                                                             */
  /* ------------------------------------------------------------------------ */

  getCapabilities(): ProviderCapabilities {
    return {
      methods: ["MOBILE_MONEY", "CARD", "BANK_TRANSFER"],

      supportedCountries: [
        "CD",
        "CI",
        "SN",
        "CM",
        "NG",
        "KE",
        "ZA",
        "GH",
        "FR",
        "US",
      ],

      supportedCurrencies: [
        "CDF",
        "XOF",
        "XAF",
        "NGN",
        "KES",
        "GHS",
        "USD",
        "EUR",
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
    const operator =
      (payload.metadata?.operator as SandboxOperator) ||
      "CARD";

    const seed =
      payload.reference +
      operator +
      payload.amount.toString();

    const scenario =
      (payload.metadata?.scenario as SandboxScenario) ||
      selectDeterministicScenario(seed);

    const latency =
      Math.min(
        payload.metadata?.latencyMs || DEFAULT_LATENCY_MS,
        MAX_LATENCY_MS
      ) || DEFAULT_LATENCY_MS;

    const context: SandboxExecutionContext = {
      operator,
      scenario,
      latencyMs: latency,
      deterministicSeed: seed,
    };

    await sleep(context.latencyMs);

    const providerReference = `SANDBOX-${crypto
      .createHash("sha1")
      .update(seed)
      .digest("hex")
      .slice(0, 12)}`;

    const status = normalizeStatus(context.scenario);

    return {
      providerReference,
      status,
      redirectUrl:
        payload.method === "CARD"
          ? "https://sandbox.debrouille.local/pay"
          : undefined,
      raw: {
        sandbox: true,
        context,
        payload,
      },
    };
  }

  /* ------------------------------------------------------------------------ */
  /* REFUND SIMULATION                                                        */
  /* ------------------------------------------------------------------------ */

  async refundPayment(
    payload: ProviderRefundRequest
  ): Promise<ProviderRefundResponse> {
    const seed =
      payload.providerReference +
      (payload.amount || 0).toString();

    const scenario = selectDeterministicScenario(seed);

    return {
      status:
        scenario === "SUCCESS" ? "SUCCESS" : "FAILED",
      raw: {
        sandbox: true,
        scenario,
        payload,
      },
    };
  }

  /* ------------------------------------------------------------------------ */
  /* WEBHOOK PARSING                                                          */
  /* ------------------------------------------------------------------------ */

  async parseWebhook(
    _headers: Record<string, any>,
    body: any
  ): Promise<ProviderWebhookPayload> {
    return {
      provider: "SANDBOX",
      event: body?.event || "sandbox.simulation",
      reference: body?.reference,
      status: body?.status || "SUCCESS",
      amount: body?.amount,
      currency: body?.currency,
      raw: body,
    };
  }

  /* ------------------------------------------------------------------------ */
  /* WEBHOOK SIGNATURE VALIDATION                                             */
  /* ------------------------------------------------------------------------ */

  async validateWebhookSignature(): Promise<boolean> {
    return true; // sandbox always trusted
  }

  /* ------------------------------------------------------------------------ */
  /* NORMALIZATION                                                            */
  /* ------------------------------------------------------------------------ */

  normalizeWebhookEvent(
    payload: ProviderWebhookPayload
  ): NormalizedWebhookEvent {
    return {
      provider: "SANDBOX",
      eventType:
        payload.status === "SUCCESS"
          ? "PAYMENT_SUCCESS"
          : payload.status === "FAILED"
          ? "PAYMENT_FAILED"
          : "PAYMENT_CREATED",
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
      provider: "SANDBOX",
      code: "UNKNOWN_ERROR",
      message:
        error instanceof Error
          ? error.message
          : "Sandbox simulation error",
      raw: error,
      retryable: false,
    };
  }
}
