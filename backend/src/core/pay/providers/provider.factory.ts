/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE PAY — PROVIDER FACTORY (WORLD CLASS INTELLIGENCE ENGINE)        */
/*  File: backend/src/core/pay/providers/provider.factory.ts                  */
/* -------------------------------------------------------------------------- */

import {
  ProviderName,
  ProviderSelectionContext,
  ProviderSelectionResult,
  ProviderConfig,
  ProviderScoreBreakdown,
} from "./provider.types";

import { PaymentProvider } from "./provider.interface";

/* -------------------------------------------------------------------------- */
/* PROVIDERS CONCRETS                                                         */
/* -------------------------------------------------------------------------- */

import { FlutterwaveProvider } from "./adapters/flutterwave.provider";
import { CinetPayProvider } from "./adapters/cinetpay.provider";
import { PaystackProvider } from "./adapters/paystack.provider";
import { StripeProvider } from "./adapters/stripe.provider";
import { SandboxProvider } from "./adapters/sandbox.provider";

/* -------------------------------------------------------------------------- */
/* REGISTRE CENTRAL                                                           */
/* -------------------------------------------------------------------------- */

const providerRegistry: Record<ProviderName, PaymentProvider> = {
  FLUTTERWAVE: new FlutterwaveProvider(),
  CINETPAY: new CinetPayProvider(),
  PAYSTACK: new PaystackProvider(),
  STRIPE: new StripeProvider(),
  SANDBOX: new SandboxProvider(),
};

/* -------------------------------------------------------------------------- */
/* CONFIG ACTIVE (ENV / DB PLUS TARD)                                          */
/* -------------------------------------------------------------------------- */

let providerConfigs: ProviderConfig[] = [
  { name: "CINETPAY", environment: "PRODUCTION", enabled: true, weight: 1.1 },
  { name: "FLUTTERWAVE", environment: "PRODUCTION", enabled: true, weight: 1.0 },
  { name: "PAYSTACK", environment: "PRODUCTION", enabled: true, weight: 1.0 },
  { name: "STRIPE", environment: "PRODUCTION", enabled: true, weight: 1.2 },
  { name: "SANDBOX", environment: "SANDBOX", enabled: true, weight: 0.1 },
];

/* -------------------------------------------------------------------------- */
/* INTERNAL METRICS MEMORY (AUTO LEARNING)                                    */
/* -------------------------------------------------------------------------- */

type ProviderRuntimeStats = {
  successRate: number;     // 0..1
  avgLatencyMs: number;    // moving average
  errorRate: number;       // 0..1
  lastFailureAt?: Date;
};

const runtimeStats: Record<ProviderName, ProviderRuntimeStats> = {
  FLUTTERWAVE: { successRate: 0.98, avgLatencyMs: 450, errorRate: 0.02 },
  CINETPAY: { successRate: 0.97, avgLatencyMs: 520, errorRate: 0.03 },
  PAYSTACK: { successRate: 0.96, avgLatencyMs: 410, errorRate: 0.04 },
  STRIPE: { successRate: 0.995, avgLatencyMs: 380, errorRate: 0.005 },
  SANDBOX: { successRate: 1, avgLatencyMs: 50, errorRate: 0 },
};

/* -------------------------------------------------------------------------- */
/* SCORING ENGINE                                                             */
/* -------------------------------------------------------------------------- */

function scoreProvider(params: {
  provider: PaymentProvider;
  config: ProviderConfig;
  context: ProviderSelectionContext;
}): ProviderScoreBreakdown {
  const { provider, config, context } = params;

  const caps = provider.getCapabilities();
  const stats = runtimeStats[config.name];

  if (!stats) {
    throw new Error(
      `Runtime stats missing for provider ${config.name}`
    );
  }

  let score = 100;

  /* -------------------------------------------------------------- */
  /* HARD FILTERS                                                   */
  /* -------------------------------------------------------------- */

  if (!caps.supportedCountries.includes(context.country)) score -= 50;
  if (!caps.supportedCurrencies.includes(context.currency)) score -= 50;
  if (!caps.methods.includes(context.method)) score -= 40;

  if (context.amount && caps.maxAmount && context.amount > caps.maxAmount) {
    score -= 80;
  }

  /* -------------------------------------------------------------- */
  /* PERFORMANCE                                                    */
  /* -------------------------------------------------------------- */

  score += stats.successRate * 40;
  score -= stats.errorRate * 60;
  score -= Math.min(stats.avgLatencyMs / 10, 30);

  /* -------------------------------------------------------------- */
  /* COST OPTIMIZATION                                              */
  /* -------------------------------------------------------------- */

  if (caps.feesPercent) {
    score -= caps.feesPercent * 10;
  }

  /* -------------------------------------------------------------- */
  /* REGIONAL PREFERENCES                                           */
  /* -------------------------------------------------------------- */

  if (caps.primaryRegions?.includes(context.country)) {
    score += 15;
  }

  /* -------------------------------------------------------------- */
  /* TRUST SENSITIVITY                                              */
  /* -------------------------------------------------------------- */

  if (context.trustScore !== undefined) {
    if (context.trustScore < 30 && caps.riskLevel === "HIGH") {
      score -= 25;
    }
  }

  /* -------------------------------------------------------------- */
  /* WEIGHTING (STRATEGIC OVERRIDE)                                 */
  /* -------------------------------------------------------------- */

  const weight = config.weight ?? 1;
  score *= weight;

  return {
    provider: config.name,
    finalScore: Math.round(score),
    metrics: {
      successRate: stats.successRate,
      errorRate: stats.errorRate,
      latencyMs: stats.avgLatencyMs,
      feesPercent: caps.feesPercent,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* PROVIDER FACTORY                                                           */
/* -------------------------------------------------------------------------- */

export class ProviderFactory {
  /* ======================================================================== */
  /* PUBLIC CONFIG HOT RELOAD                                                 */
  /* ======================================================================== */

  static updateConfig(configs: ProviderConfig[]) {
    providerConfigs = configs;
    console.info("🔁 Provider config updated dynamically");
  }

  /* ======================================================================== */
  /* MAIN SELECTION ENGINE                                                    */
  /* ======================================================================== */

  static selectProvider(
    context: ProviderSelectionContext
  ): ProviderSelectionResult {
    const enabledConfigs = providerConfigs.filter((c) => c.enabled);

    if (!enabledConfigs.length) {
      throw new Error("No enabled payment providers configured");
    }

    const scores = enabledConfigs.map((config) => {
      const provider = providerRegistry[config.name];

      if (!provider) {
        throw new Error(
          `Provider ${config.name} not registered in registry`
        );
      }

      return scoreProvider({ provider, config, context });
    });

    scores.sort((a, b) => b.finalScore - a.finalScore);

    const best = scores[0];

    if (!best || best.finalScore < 40) {
      throw new Error("No provider meets minimum quality threshold");
    }

    return {
      provider: best.provider,
      reason: "Best score selected by scoring engine",
      finalScore: best.finalScore,
      breakdown: scores,
    };
  }

  /* ======================================================================== */
  /* INSTANCE ACCESS                                                          */
  /* ======================================================================== */

  static getProvider(name: ProviderName): PaymentProvider {
    const provider = providerRegistry[name];

    if (!provider) {
      throw new Error(`Provider ${name} not registered`);
    }

    return provider;
  }

  /* ======================================================================== */
  /* FEEDBACK LOOP (AUTO-LEARNING)                                             */
  /* ======================================================================== */

  static reportResult(params: {
    provider: ProviderName;
    success: boolean;
    latencyMs: number;
  }) {
    const stats = runtimeStats[params.provider];

    if (!stats) return;

    const alpha = 0.2; // smoothing factor

    stats.avgLatencyMs =
      stats.avgLatencyMs * (1 - alpha) +
      params.latencyMs * alpha;

    stats.successRate =
      stats.successRate * (1 - alpha) +
      (params.success ? 1 : 0) * alpha;

    stats.errorRate = 1 - stats.successRate;

    if (!params.success) {
      stats.lastFailureAt = new Date();
    }
  }
}
