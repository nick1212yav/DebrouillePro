/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE SEARCH — QUERY INTELLIGENCE ENGINE (WORLD #1)                  */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/search/search.query.engine.ts                      */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Comprendre une requête humaine                                         */
/*   - Corriger fautes / abréviations / SMS                                   */
/*   - Détecter intention                                                     */
/*   - Étendre sémantiquement                                                 */
/*   - Support offline                                                        */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import crypto from "crypto";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type SearchIntent =
  | "DISCOVER"
  | "BUY"
  | "NEARBY"
  | "HELP"
  | "COMPARE"
  | "LEARN";

export type NormalizedQuery = {
  raw: string;
  normalized: string;
  tokens: string[];
  language: string;
  intent: SearchIntent;
  expandedTokens: string[];
  confidence: number;
};

/* -------------------------------------------------------------------------- */
/* DICTIONARIES (AFRICA-FIRST)                                                */
/* -------------------------------------------------------------------------- */

const SYNONYMS: Record<string, string[]> = {
  taxi: ["transport", "moto", "uber", "boda"],
  food: ["restaurant", "manger", "repas"],
  phone: ["tel", "gsm", "mobile"],
  job: ["travail", "emploi", "kazi"],
  house: ["maison", "logement", "ndako"],
  doctor: ["medecin", "docteur", "nganga"],
};

const INTENT_KEYWORDS: Record<
  SearchIntent,
  string[]
> = {
  DISCOVER: ["voir", "trouver", "chercher"],
  BUY: ["acheter", "prix", "commander"],
  NEARBY: ["proche", "près", "ici", "near"],
  HELP: ["aide", "urgence", "help"],
  COMPARE: ["comparer", "vs", "meilleur"],
  LEARN: ["apprendre", "cours", "info"],
};

/* -------------------------------------------------------------------------- */
/* UTILS                                                                      */
/* -------------------------------------------------------------------------- */

const normalizeText = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenize = (text: string) =>
  text.split(" ").filter(Boolean);

const detectLanguage = (text: string): string => {
  if (text.match(/\b(na|yo|oyo)\b/)) return "LN"; // Lingala
  if (text.match(/\b(ni|kwa|sana)\b/)) return "SW"; // Swahili
  return "FR";
};

const fuzzyMatch = (a: string, b: string) => {
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a))
    return 0.8;
  return 0;
};

/* -------------------------------------------------------------------------- */
/* QUERY ENGINE                                                               */
/* -------------------------------------------------------------------------- */

export class SearchQueryEngine {
  /* ======================================================================== */
  /* MAIN                                                                     */
  /* ======================================================================== */

  analyze(raw: string): NormalizedQuery {
    const normalized = normalizeText(raw);
    const tokens = tokenize(normalized);
    const language = detectLanguage(normalized);

    const intent = this.detectIntent(tokens);
    const expandedTokens =
      this.expandTokens(tokens);

    const confidence = this.computeConfidence(
      tokens,
      expandedTokens
    );

    return {
      raw,
      normalized,
      tokens,
      language,
      intent,
      expandedTokens,
      confidence,
    };
  }

  /* ======================================================================== */
  /* INTENT DETECTION                                                         */
  /* ======================================================================== */

  private detectIntent(
    tokens: string[]
  ): SearchIntent {
    for (const [intent, keywords] of Object.entries(
      INTENT_KEYWORDS
    )) {
      if (
        keywords.some((k) =>
          tokens.includes(k)
        )
      ) {
        return intent as SearchIntent;
      }
    }

    return "DISCOVER";
  }

  /* ======================================================================== */
  /* SEMANTIC EXPANSION                                                       */
  /* ======================================================================== */

  private expandTokens(
    tokens: string[]
  ): string[] {
    const expanded = new Set<string>(tokens);

    for (const token of tokens) {
      const synonyms = SYNONYMS[token];
      if (synonyms) {
        synonyms.forEach((s) =>
          expanded.add(s)
        );
      }

      // fuzzy expansion
      for (const key of Object.keys(
        SYNONYMS
      )) {
        if (fuzzyMatch(token, key) > 0.7) {
          SYNONYMS[key].forEach((s) =>
            expanded.add(s)
          );
        }
      }
    }

    return Array.from(expanded);
  }

  /* ======================================================================== */
  /* CONFIDENCE                                                               */
  /* ======================================================================== */

  private computeConfidence(
    tokens: string[],
    expanded: string[]
  ): number {
    if (tokens.length === 0) return 0;

    const ratio =
      expanded.length / tokens.length;

    return Math.min(1, 0.5 + ratio / 5);
  }
}

/* -------------------------------------------------------------------------- */
/* SINGLETON                                                                  */
/* -------------------------------------------------------------------------- */

export const searchQueryEngine =
  new SearchQueryEngine();
