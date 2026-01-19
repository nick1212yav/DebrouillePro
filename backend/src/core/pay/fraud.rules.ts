/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE PAY — FRAUD RULES ENGINE (WORLD #1 GOVERNANCE)                  */
/*  File: backend/src/core/pay/fraud.rules.ts                                  */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  MISSION :                                                                 */
/*  - Encadrer les décisions du FraudEngine par des règles explicites          */
/*  - Adapter dynamiquement la sécurité par pays, contexte, produit           */
/*  - Garantir explicabilité légale et gouvernance humaine                    */
/*                                                                            */
/*  PRINCIPES NON NÉGOCIABLES :                                                */
/*  - Toute décision est traçable                                             */
/*  - Les règles sont déterministes                                           */
/*  - L’IA ne décide jamais seule                                             */
/*  - Les règles peuvent évoluer sans casser le système                       */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Types } from "mongoose";

/* -------------------------------------------------------------------------- */
/* CORE ENUMS                                                                 */
/* -------------------------------------------------------------------------- */

export type FraudRuleScope =
  | "GLOBAL"
  | "COUNTRY"
  | "NETWORK"
  | "MODULE"
  | "IDENTITY";

export type FraudRuleDecision =
  | "ALLOW"
  | "MONITOR"
  | "LIMIT"
  | "BLOCK"
  | "FREEZE"
  | "ESCALATE";

export type FraudRuleSeverity =
  | "INFO"
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";

/* -------------------------------------------------------------------------- */
/* RULE CONDITION TYPES                                                       */
/* -------------------------------------------------------------------------- */

export type FraudConditionOperator =
  | "EQ"
  | "NEQ"
  | "GT"
  | "GTE"
  | "LT"
  | "LTE"
  | "IN"
  | "NOT_IN"
  | "CONTAINS"
  | "EXISTS";

export interface FraudRuleCondition {
  field:
    | "riskScore"
    | "amount"
    | "currency"
    | "country"
    | "networkType"
    | "trustScore"
    | "velocity"
    | "deviceChange"
    | "blacklisted"
    | "hour"
    | "dayOfWeek"
    | "identityAgeDays";

  operator: FraudConditionOperator;
  value?: any;
}

/* -------------------------------------------------------------------------- */
/* RULE ACTIONS                                                               */
/* -------------------------------------------------------------------------- */

export interface FraudRuleAction {
  decision: FraudRuleDecision;
  severity: FraudRuleSeverity;
  reason: string;

  limits?: {
    maxAmount?: number;
    maxDailyOperations?: number;
    cooldownMinutes?: number;
  };

  notify?: {
    admin?: boolean;
    user?: boolean;
    security?: boolean;
  };

  tags?: string[];
}

/* -------------------------------------------------------------------------- */
/* RULE DEFINITION                                                            */
/* -------------------------------------------------------------------------- */

export interface FraudRuleDefinition {
  id: string;
  name: string;
  description: string;

  scope: FraudRuleScope;
  enabled: boolean;
  priority: number; // plus petit = exécuté en premier

  appliesTo?: {
    countries?: string[];
    networks?: string[];
    modules?: string[];
    identityIds?: Types.ObjectId[];
  };

  conditions: FraudRuleCondition[];
  action: FraudRuleAction;
}

/* -------------------------------------------------------------------------- */
/* RUNTIME CONTEXT                                                            */
/* -------------------------------------------------------------------------- */

export interface FraudRuntimeContext {
  riskScore: number;
  amount?: number;
  currency?: string;
  country?: string;
  networkType?: string;
  trustScore?: number;
  velocity?: number;
  deviceChange?: boolean;
  blacklisted?: boolean;
  identityAgeDays?: number;
  timestamp: Date;
}

/* -------------------------------------------------------------------------- */
/* RULE RESULT                                                                */
/* -------------------------------------------------------------------------- */

export interface FraudRuleResult {
  ruleId: string;
  matched: boolean;
  action?: FraudRuleAction;
}

/* -------------------------------------------------------------------------- */
/* DEFAULT RULESET (WORLD BOOTSTRAP)                                           */
/* -------------------------------------------------------------------------- */

export const DEFAULT_FRAUD_RULES: FraudRuleDefinition[] = [
  {
    id: "GLOBAL_HIGH_RISK_FREEZE",
    name: "Freeze Critical Risk",
    description:
      "Toute opération avec un risque critique est immédiatement gelée.",
    scope: "GLOBAL",
    enabled: true,
    priority: 1,
    conditions: [
      {
        field: "riskScore",
        operator: "GTE",
        value: 90,
      },
    ],
    action: {
      decision: "FREEZE",
      severity: "CRITICAL",
      reason: "Risque critique détecté par le moteur antifraude",
      notify: {
        admin: true,
        security: true,
        user: false,
      },
      tags: ["AUTO_FREEZE", "CRITICAL_RISK"],
    },
  },

  {
    id: "HIGH_AMOUNT_MONITORING",
    name: "High Amount Monitoring",
    description:
      "Surveillance renforcée pour montants élevés",
    scope: "GLOBAL",
    enabled: true,
    priority: 5,
    conditions: [
      {
        field: "amount",
        operator: "GT",
        value: 5000,
      },
      {
        field: "trustScore",
        operator: "LT",
        value: 60,
      },
    ],
    action: {
      decision: "MONITOR",
      severity: "HIGH",
      reason:
        "Montant élevé combiné à un trust insuffisant",
      notify: {
        admin: false,
        security: true,
      },
      tags: ["HIGH_AMOUNT", "LOW_TRUST"],
    },
  },

  {
    id: "NEW_DEVICE_LIMIT",
    name: "New Device Limitation",
    description:
      "Limiter les opérations lors d’un changement d’appareil",
    scope: "GLOBAL",
    enabled: true,
    priority: 10,
    conditions: [
      {
        field: "deviceChange",
        operator: "EQ",
        value: true,
      },
    ],
    action: {
      decision: "LIMIT",
      severity: "MEDIUM",
      reason: "Nouvel appareil détecté",
      limits: {
        maxAmount: 1000,
        cooldownMinutes: 60,
      },
      notify: {
        user: true,
      },
      tags: ["DEVICE_RISK"],
    },
  },

  {
    id: "BLACKLIST_BLOCK",
    name: "Blacklist Immediate Block",
    description:
      "Bloquer immédiatement toute IP / réseau blacklisté",
    scope: "GLOBAL",
    enabled: true,
    priority: 0,
    conditions: [
      {
        field: "blacklisted",
        operator: "EQ",
        value: true,
      },
    ],
    action: {
      decision: "BLOCK",
      severity: "CRITICAL",
      reason: "Source blacklistée détectée",
      notify: {
        admin: true,
        security: true,
      },
      tags: ["BLACKLIST", "SECURITY"],
    },
  },
];

/* -------------------------------------------------------------------------- */
/* RULE ENGINE                                                                */
/* -------------------------------------------------------------------------- */

export class FraudRulesEngine {
  /* ======================================================================== */
  /* PUBLIC API                                                               */
  /* ======================================================================== */

  static evaluate(
    context: FraudRuntimeContext,
    rules: FraudRuleDefinition[] = DEFAULT_FRAUD_RULES
  ): FraudRuleResult[] {
    const orderedRules = [...rules]
      .filter((r) => r.enabled)
      .sort((a, b) => a.priority - b.priority);

    const results: FraudRuleResult[] = [];

    for (const rule of orderedRules) {
      const matched = this.matchRule(
        rule,
        context
      );

      if (matched) {
        results.push({
          ruleId: rule.id,
          matched: true,
          action: rule.action,
        });

        // Stop propagation if critical decision
        if (
          rule.action.decision === "FREEZE" ||
          rule.action.decision === "BLOCK"
        ) {
          break;
        }
      }
    }

    return results;
  }

  /* ======================================================================== */
  /* RULE MATCHING                                                            */
  /* ======================================================================== */

  private static matchRule(
    rule: FraudRuleDefinition,
    context: FraudRuntimeContext
  ): boolean {
    return rule.conditions.every((condition) =>
      this.evaluateCondition(condition, context)
    );
  }

  private static evaluateCondition(
    condition: FraudRuleCondition,
    context: FraudRuntimeContext
  ): boolean {
    const value = (context as any)[
      condition.field
    ];

    switch (condition.operator) {
      case "EQ":
        return value === condition.value;

      case "NEQ":
        return value !== condition.value;

      case "GT":
        return value > condition.value;

      case "GTE":
        return value >= condition.value;

      case "LT":
        return value < condition.value;

      case "LTE":
        return value <= condition.value;

      case "IN":
        return Array.isArray(condition.value)
          ? condition.value.includes(value)
          : false;

      case "NOT_IN":
        return Array.isArray(condition.value)
          ? !condition.value.includes(value)
          : false;

      case "CONTAINS":
        return typeof value === "string" &&
          typeof condition.value === "string"
          ? value.includes(condition.value)
          : false;

      case "EXISTS":
        return value !== undefined &&
          value !== null;

      default:
        return false;
    }
  }
}
