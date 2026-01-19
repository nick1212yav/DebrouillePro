/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE PAY — FINANCIAL RULES ENGINE (ULTRA FINAL)                      */
/*  File: backend/src/core/pay/pay.rules.ts                                    */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  MISSION                                                                     */
/*  - Gouverner TOUTE décision financière                                      */
/*  - Bloquer fraude, abus, blanchiment, surendettement                         */
/*  - Garantir équité, transparence, conformité                                 */
/*  - Rendre chaque décision explicable humainement & audit-ready               */
/*                                                                            */
/*  PHILOSOPHIE                                                                 */
/*  - Deterministic First                                                      */
/*  - Zero Trust Default                                                       */
/*  - Explainability Mandatory                                                 */
/*  - AI Advisory Only (jamais décisionnaire)                                  */
/*  - Africa-ready • Global-ready                                              */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* DECISION TYPES                                                              */
/* -------------------------------------------------------------------------- */

export type PayDecision =
  | "ALLOW"        // autorisé sans restriction
  | "LIMIT"        // autorisé avec plafonds
  | "REVIEW"       // validation humaine requise
  | "DENY";        // interdit

export type PayRiskLevel =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";

/* -------------------------------------------------------------------------- */
/* ACTIONS                                                                     */
/* -------------------------------------------------------------------------- */

export type PayAction =
  | "WALLET_CREATE"
  | "PAYMENT"
  | "ESCROW_LOCK"
  | "ESCROW_RELEASE"
  | "PAYOUT_REQUEST"
  | "INVOICE_ISSUE"
  | "TOPUP"
  | "REFUND";

/* -------------------------------------------------------------------------- */
/* CONTEXT                                                                     */
/* -------------------------------------------------------------------------- */

export interface PayContext {
  /* Identity */
  ownerType: "PERSON" | "ORGANIZATION";
  trustScore: number;                 // 0–100
  verificationLevel: number;          // KYC / KYB

  /* Action */
  action: PayAction;

  /* Financial */
  amount?: number;
  currency?: string;

  /* Velocity */
  dailyTotalOut?: number;
  monthlyTotalOut?: number;
  transactionCount24h?: number;

  /* Geo & Risk */
  countryCode?: string;
  ipRiskScore?: number;               // 0–100
  deviceFingerprintRisk?: number;     // 0–100

  /* Flags */
  flags?: Array<
    | "NEW_ACCOUNT"
    | "SUSPICIOUS_IP"
    | "TOR_EXIT_NODE"
    | "SANCTION_COUNTRY"
    | "CHARGEBACK_HISTORY"
    | "VELOCITY_SPIKE"
    | "MANUAL_REVIEW_REQUESTED"
  >;

  /* AI advisory */
  aiRiskScore?: number;               // 0–100 (non bloquant)
  aiRecommendation?: string;
}

/* -------------------------------------------------------------------------- */
/* RULE TRACE                                                                  */
/* -------------------------------------------------------------------------- */

export interface PayRuleTrace {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  impact?: string;
}

/* -------------------------------------------------------------------------- */
/* RESULT                                                                      */
/* -------------------------------------------------------------------------- */

export interface PayRuleResult {
  decision: PayDecision;
  riskLevel: PayRiskLevel;
  reason: string;

  limitsApplied?: {
    maxAmount?: number;
    requiresManualReview?: boolean;
    cooldownHours?: number;
  };

  traces: PayRuleTrace[];

  aiAdvisory?: {
    riskScore?: number;
    recommendation?: string;
  };
}

/* -------------------------------------------------------------------------- */
/* INTERNAL CONSTANTS                                                          */
/* -------------------------------------------------------------------------- */

const TRUST_THRESHOLDS = {
  BLOCKED: 10,
  LOW: 25,
  MEDIUM: 50,
  HIGH: 75,
};

const DEFAULT_LIMITS = {
  PERSON: {
    DAILY_OUT: 3_000,
    MONTHLY_OUT: 20_000,
    PAYOUT_AUTO: 2_000,
  },
  ORGANIZATION: {
    DAILY_OUT: 25_000,
    MONTHLY_OUT: 200_000,
    PAYOUT_AUTO: 20_000,
  },
};

/* -------------------------------------------------------------------------- */
/* UTILS                                                                       */
/* -------------------------------------------------------------------------- */

const trace = (
  ruleId: string,
  ruleName: string,
  passed: boolean,
  impact?: string
): PayRuleTrace => ({
  ruleId,
  ruleName,
  passed,
  impact,
});

const clamp = (value: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, value));

/* -------------------------------------------------------------------------- */
/* PAY RULES ENGINE                                                            */
/* -------------------------------------------------------------------------- */

export class PayRulesEngine {
  static evaluate(context: PayContext): PayRuleResult {
    const traces: PayRuleTrace[] = [];
    let decision: PayDecision = "ALLOW";
    let riskLevel: PayRiskLevel = "LOW";
    let reason = "All financial rules passed";

    /* ====================================================================== */
    /* RULE — TRUST BLOCK                                                     */
    /* ====================================================================== */

    const trust = clamp(context.trustScore);

    const trustAllowed = trust >= TRUST_THRESHOLDS.BLOCKED;

    traces.push(
      trace(
        "TRUST_MIN",
        "Minimum trust threshold",
        trustAllowed,
        trustAllowed
          ? undefined
          : "Trust score below minimum allowed threshold"
      )
    );

    if (!trustAllowed) {
      return {
        decision: "DENY",
        riskLevel: "CRITICAL",
        reason: "Trust score too low for any financial operation",
        traces,
      };
    }

    /* ====================================================================== */
    /* RULE — SANCTION & GEO BLOCK                                             */
    /* ====================================================================== */

    const sanctioned =
      context.flags?.includes("SANCTION_COUNTRY") === true;

    traces.push(
      trace(
        "SANCTION_GEO",
        "Sanctioned country check",
        !sanctioned,
        sanctioned ? "Operation blocked due to sanction rules" : undefined
      )
    );

    if (sanctioned) {
      return {
        decision: "DENY",
        riskLevel: "CRITICAL",
        reason: "Operation blocked due to sanctioned region",
        traces,
      };
    }

    /* ====================================================================== */
    /* RULE — HIGH RISK NETWORK                                                */
    /* ====================================================================== */

    const highNetworkRisk =
      (context.ipRiskScore || 0) > 80 ||
      context.flags?.includes("TOR_EXIT_NODE");

    traces.push(
      trace(
        "NETWORK_RISK",
        "High risk network detection",
        !highNetworkRisk,
        highNetworkRisk
          ? "High risk IP / TOR network detected"
          : undefined
      )
    );

    if (highNetworkRisk) {
      decision = "REVIEW";
      riskLevel = "HIGH";
      reason = "High risk network detected";
    }

    /* ====================================================================== */
    /* RULE — VELOCITY CONTROL                                                 */
    /* ====================================================================== */

    const velocitySpike =
      (context.transactionCount24h || 0) > 30 ||
      context.flags?.includes("VELOCITY_SPIKE");

    traces.push(
      trace(
        "VELOCITY",
        "Abnormal transaction velocity",
        !velocitySpike,
        velocitySpike ? "Unusual transaction frequency detected" : undefined
      )
    );

    if (velocitySpike && decision !== "DENY") {
      decision = "REVIEW";
      riskLevel = "HIGH";
      reason = "Abnormal transaction velocity";
    }

    /* ====================================================================== */
    /* RULE — PAYOUT CONTROL                                                   */
    /* ====================================================================== */

    if (context.action === "PAYOUT_REQUEST" && context.amount) {
      const limits =
        DEFAULT_LIMITS[context.ownerType];

      const autoLimit = limits.PAYOUT_AUTO;
      const exceeds = context.amount > autoLimit;

      traces.push(
        trace(
          "PAYOUT_LIMIT",
          "Automatic payout threshold",
          !exceeds,
          exceeds
            ? `Amount exceeds auto payout limit (${autoLimit})`
            : undefined
        )
      );

      if (exceeds && decision !== "DENY") {
        decision = "LIMIT";
        riskLevel = "MEDIUM";
        reason = "Payout exceeds automatic threshold";
      }

      if (trust < TRUST_THRESHOLDS.MEDIUM) {
        traces.push(
          trace(
            "PAYOUT_TRUST",
            "Payout trust requirement",
            false,
            "Trust score insufficient for payout"
          )
        );

        return {
          decision: "REVIEW",
          riskLevel: "HIGH",
          reason: "Trust score insufficient for payout",
          traces,
        };
      }
    }

    /* ====================================================================== */
    /* RULE — DAILY / MONTHLY LIMITS                                           */
    /* ====================================================================== */

    if (context.amount) {
      const limits =
        DEFAULT_LIMITS[context.ownerType];

      const projectedDaily =
        (context.dailyTotalOut || 0) +
        context.amount;

      const projectedMonthly =
        (context.monthlyTotalOut || 0) +
        context.amount;

      const dailyExceeded =
        projectedDaily > limits.DAILY_OUT;

      const monthlyExceeded =
        projectedMonthly > limits.MONTHLY_OUT;

      traces.push(
        trace(
          "DAILY_LIMIT",
          "Daily outgoing limit",
          !dailyExceeded,
          dailyExceeded
            ? `Projected daily ${projectedDaily} exceeds ${limits.DAILY_OUT}`
            : undefined
        )
      );

      traces.push(
        trace(
          "MONTHLY_LIMIT",
          "Monthly outgoing limit",
          !monthlyExceeded,
          monthlyExceeded
            ? `Projected monthly ${projectedMonthly} exceeds ${limits.MONTHLY_OUT}`
            : undefined
        )
      );

      if ((dailyExceeded || monthlyExceeded) && decision !== "DENY") {
        decision = "LIMIT";
        riskLevel = "MEDIUM";
        reason = "Outgoing financial limits exceeded";
      }
    }

    /* ====================================================================== */
    /* RULE — ORGANIZATION PRIVILEGE BOOST                                     */
    /* ====================================================================== */

    const orgBoost =
      context.ownerType === "ORGANIZATION" &&
      context.trustScore >= TRUST_THRESHOLDS.HIGH &&
      context.verificationLevel >= 2;

    traces.push(
      trace(
        "ORG_BOOST",
        "Verified organization privilege boost",
        orgBoost,
        orgBoost
          ? "Higher limits allowed for verified organization"
          : undefined
      )
    );

    if (orgBoost && decision === "ALLOW") {
      riskLevel = "LOW";
    }

    /* ====================================================================== */
    /* AI ADVISORY (NON-BLOCKING)                                               */
    /* ====================================================================== */

    const aiRisk = clamp(context.aiRiskScore || 0);

    if (aiRisk > 70 && decision === "ALLOW") {
      decision = "REVIEW";
      riskLevel = "MEDIUM";
      reason = "AI advisory flagged elevated risk";
    }

    /* ====================================================================== */
    /* FINAL RESULT                                                            */
    /* ====================================================================== */

    return {
      decision,
      riskLevel,
      reason,
      traces,
      aiAdvisory: {
        riskScore: context.aiRiskScore,
        recommendation: context.aiRecommendation,
      },
    };
  }
}
