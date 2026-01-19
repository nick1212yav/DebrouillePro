/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE SEARCH — QUERY BUILDER (WORLD #1 INTELLIGENT)                  */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/search/search.query.builder.ts                     */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Transformer une intention humaine en requête machine                  */
/*   - Normaliser pagination, filtres, géolocalisation                        */
/*   - Produire un SearchQueryInput canonique                                 */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import crypto from "crypto";

import {
  SearchIntent,
  SearchQueryInput,
  SearchDomain,
  GeoContext,
} from "./search.types";

/* -------------------------------------------------------------------------- */
/* DEFAULTS                                                                   */
/* -------------------------------------------------------------------------- */

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/* -------------------------------------------------------------------------- */
/* QUERY BUILDER                                                              */
/* -------------------------------------------------------------------------- */

export class SearchQueryBuilder {
  /* ====================================================================== */
  /* BUILD                                                                  */
  /* ====================================================================== */

  static build(params: {
    rawQuery: string;
    semanticContext?: {
      expandedText?: string;
      keywords?: string[];
    };
    intent?: SearchIntent;
    personalization?: Record<string, unknown>;
    modules?: string[];
    geo?: string | GeoContext;
    page?: number;
    limit?: number;
  }): SearchQueryInput {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(
      Math.max(1, params.limit ?? DEFAULT_LIMIT),
      MAX_LIMIT
    );

    const offset = (page - 1) * limit;

    const text =
      params.semanticContext?.expandedText ??
      params.rawQuery;

    return {
      text,
      limit,
      domains: this.normalizeDomains(
        params.modules
      ),
      geo: this.normalizeGeo(params.geo),
      intent:
        params.intent ?? SearchIntent.UNKNOWN,
      traceId: crypto.randomUUID(),
    };
  }

  /* ====================================================================== */
  /* NORMALIZERS                                                             */
  /* ====================================================================== */

  private static normalizeDomains(
    modules?: string[]
  ): SearchDomain[] | undefined {
    if (!modules?.length) return undefined;

    return modules.filter(Boolean) as SearchDomain[];
  }

  private static normalizeGeo(
    geo?: string | GeoContext
  ): GeoContext | undefined {
    if (!geo) return undefined;

    if (typeof geo === "string") {
      return { city: geo };
    }

    return geo;
  }
}
