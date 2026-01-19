/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE SEARCH — SEMANTIC ENGINE (COGNITIVE LAYER)                     */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/search/intelligence/semantic.engine.ts             */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Compréhension sémantique humaine                                       */
/*   - Multilingue                                                            */
/*   - Normalisation linguistique                                             */
/*   - Synonymes culturels                                                    */
/*   - Tolérance aux fautes                                                   */
/*   - Préparation IA                                                         */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import crypto from "crypto";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type SemanticIntent =
  | "search"
  | "navigate"
  | "compare"
  | "buy"
  | "learn"
  | "emergency"
  | "unknown";

export type SemanticEntity = {
  type:
    | "location"
    | "time"
    | "service"
    | "person"
    | "organization"
    | "category"
    | "price"
    | "urgency";
  value: string;
  confidence: number;
};

export interface SemanticAnalysisResult {
  normalizedText: string;
  language: string;
  intent: SemanticIntent;
  entities: SemanticEntity[];
  confidence: number;
  semanticHash: string;
}

/* -------------------------------------------------------------------------- */
/* KNOWLEDGE BASE (AFRICA + GLOBAL)                                           */
/* -------------------------------------------------------------------------- */

const SYNONYMS: Record<string, string[]> = {
  hospital: [
    "hôpital",
    "hopital",
    "clinique",
    "centre de santé",
    "health center",
    "dispensaire",
  ],
  pharmacy: [
    "pharmacie",
    "drugstore",
    "apothicaire",
  ],
  school: [
    "école",
    "college",
    "lycée",
    "université",
    "school",
  ],
  transport: [
    "bus",
    "taxi",
    "moto",
    "boda",
    "uber",
    "transport",
  ],
  urgent: [
    "urgent",
    "vite",
    "maintenant",
    "asap",
    "urgence",
    "immédiatement",
  ],
  nearby: [
    "près",
    "proche",
    "à côté",
    "near",
    "around",
    "voisin",
  ],
};

/* -------------------------------------------------------------------------- */
/* LANGUAGE DETECTION (LIGHTWEIGHT)                                           */
/* -------------------------------------------------------------------------- */

function detectLanguage(text: string): string {
  if (/[àâçéèêëîïôûùüÿñæœ]/i.test(text)) return "fr";
  if (/[a-z]/i.test(text)) return "en";
  return "unknown";
}

/* -------------------------------------------------------------------------- */
/* NORMALIZATION                                                              */
/* -------------------------------------------------------------------------- */

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* -------------------------------------------------------------------------- */
/* ENTITY EXTRACTION                                                          */
/* -------------------------------------------------------------------------- */

function extractEntities(
  normalized: string
): SemanticEntity[] {
  const entities: SemanticEntity[] = [];

  for (const [canonical, words] of Object.entries(
    SYNONYMS
  )) {
    for (const word of words) {
      if (normalized.includes(word)) {
        entities.push({
          type:
            canonical === "urgent"
              ? "urgency"
              : canonical === "nearby"
              ? "location"
              : "category",
          value: canonical,
          confidence: 0.7,
        });
      }
    }
  }

  return entities;
}

/* -------------------------------------------------------------------------- */
/* INTENT DETECTION                                                           */
/* -------------------------------------------------------------------------- */

function detectIntent(
  normalized: string,
  entities: SemanticEntity[]
): SemanticIntent {
  if (
    entities.some((e) => e.type === "urgency")
  ) {
    return "emergency";
  }

  if (
    normalized.includes("acheter") ||
    normalized.includes("buy") ||
    normalized.includes("prix")
  ) {
    return "buy";
  }

  if (
    normalized.includes("comment") ||
    normalized.includes("how") ||
    normalized.includes("learn")
  ) {
    return "learn";
  }

  if (
    normalized.includes("aller") ||
    normalized.includes("go") ||
    normalized.includes("navigate")
  ) {
    return "navigate";
  }

  return "search";
}

/* -------------------------------------------------------------------------- */
/* SEMANTIC ENGINE                                                            */
/* -------------------------------------------------------------------------- */

export class SemanticEngine {
  static analyze(
    rawText: string
  ): SemanticAnalysisResult {
    const normalizedText = normalize(rawText);
    const language = detectLanguage(rawText);
    const entities = extractEntities(normalizedText);
    const intent = detectIntent(
      normalizedText,
      entities
    );

    const confidence =
      entities.length > 0 ? 0.8 : 0.5;

    const semanticHash = crypto
      .createHash("sha1")
      .update(
        normalizedText +
          intent +
          JSON.stringify(entities)
      )
      .digest("hex");

    return {
      normalizedText,
      language,
      intent,
      entities,
      confidence,
      semanticHash,
    };
  }
}
