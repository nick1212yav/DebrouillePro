/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE SEARCH — INTENT ENGINE (DECISION CORE)                         */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/search/intelligence/intent.engine.ts               */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Transformer une analyse sémantique en action système                   */
/*   - Router vers les bons modules                                           */
/*   - Appliquer règles business, sécurité et priorité                        */
/*   - Préparer orchestration IA                                              */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  SemanticAnalysisResult,
  SemanticIntent,
} from "./semantic.engine";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type SystemAction =
  | "SEARCH_INDEX"
  | "NAVIGATE_MAP"
  | "OPEN_MODULE"
  | "EMERGENCY_ALERT"
  | "START_TRANSACTION"
  | "SHOW_GUIDE"
  | "UNKNOWN";

export interface IntentDecisionContext {
  geoLocation?: {
    lat: number;
    lng: number;
    city?: string;
    country?: string;
  };

  trustScore?: number;
  isAuthenticated?: boolean;
  activeModule?: string;
  device?: "mobile" | "desktop" | "offline";
}

export interface IntentDecisionResult {
  intent: SemanticIntent;
  action: SystemAction;
  targetModule?: string;
  priority: number; // 0 → 100
  explanation: string;
  safe: boolean;
  confidence: number;
}

/* -------------------------------------------------------------------------- */
/* INTENT MAPPING MATRIX                                                      */
/* -------------------------------------------------------------------------- */

const INTENT_ACTION_MATRIX: Record<
  SemanticIntent,
  {
    action: SystemAction;
    defaultPriority: number;
    module?: string;
  }
> = {
  search: {
    action: "SEARCH_INDEX",
    defaultPriority: 40,
  },
  navigate: {
    action: "NAVIGATE_MAP",
    defaultPriority: 60,
    module: "map-3d",
  },
  compare: {
    action: "SEARCH_INDEX",
    defaultPriority: 50,
  },
  buy: {
    action: "START_TRANSACTION",
    defaultPriority: 70,
    module: "pay",
  },
  learn: {
    action: "SHOW_GUIDE",
    defaultPriority: 45,
    module: "learn",
  },
  emergency: {
    action: "EMERGENCY_ALERT",
    defaultPriority: 100,
    module: "health",
  },
  unknown: {
    action: "UNKNOWN",
    defaultPriority: 10,
  },
};

/* -------------------------------------------------------------------------- */
/* RISK EVALUATION                                                            */
/* -------------------------------------------------------------------------- */

function evaluateSafety(
  intent: SemanticIntent,
  ctx: IntentDecisionContext
): boolean {
  if (intent === "buy" && !ctx.isAuthenticated) {
    return false;
  }

  if (
    intent === "emergency" &&
    ctx.device === "offline"
  ) {
    return true; // offline allowed (SMS / USSD)
  }

  return true;
}

/* -------------------------------------------------------------------------- */
/* PRIORITY BOOSTER                                                           */
/* -------------------------------------------------------------------------- */

function computePriorityBoost(
  intent: SemanticIntent,
  ctx: IntentDecisionContext
): number {
  let boost = 0;

  if (intent === "emergency") boost += 50;

  if (ctx.trustScore && ctx.trustScore > 80) {
    boost += 10;
  }

  if (ctx.geoLocation) {
    boost += 5;
  }

  if (ctx.device === "mobile") {
    boost += 5;
  }

  return boost;
}

/* -------------------------------------------------------------------------- */
/* EXPLANATION BUILDER                                                        */
/* -------------------------------------------------------------------------- */

function explain(
  intent: SemanticIntent,
  action: SystemAction,
  safe: boolean
): string {
  if (!safe) {
    return "Action blocked due to security constraints.";
  }

  switch (intent) {
    case "emergency":
      return "Emergency detected. Triggering high priority response.";
    case "buy":
      return "Purchase intent detected. Secure transaction initiated.";
    case "navigate":
      return "Navigation intent detected. Routing to map engine.";
    case "learn":
      return "Learning intent detected. Displaying guidance content.";
    default:
      return "General search intent detected.";
  }
}

/* -------------------------------------------------------------------------- */
/* INTENT ENGINE                                                              */
/* -------------------------------------------------------------------------- */

export class IntentEngine {
  static decide(
    semantic: SemanticAnalysisResult,
    context: IntentDecisionContext = {}
  ): IntentDecisionResult {
    const mapping =
      INTENT_ACTION_MATRIX[semantic.intent];

    const safe = evaluateSafety(
      semantic.intent,
      context
    );

    const boost = computePriorityBoost(
      semantic.intent,
      context
    );

    const priority =
      mapping.defaultPriority + boost;

    return {
      intent: semantic.intent,
      action: mapping.action,
      targetModule: mapping.module,
      priority: Math.min(priority, 100),
      explanation: explain(
        semantic.intent,
        mapping.action,
        safe
      ),
      safe,
      confidence: semantic.confidence,
    };
  }
}
