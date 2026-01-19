/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE SEARCH — SEARCH CONTROLLER (WORLD #1 ENGINE)                  */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/search/search.controller.ts                       */
/* -------------------------------------------------------------------------- */

import { IdentityContext } from "../identity/identity.types";

import { SearchService } from "./search.service";
import { SearchQueryBuilder } from "./search.query.builder";
import { SearchRankEngine } from "./search.rank.engine";

import { SemanticEngine } from "./intelligence/semantic.engine";
import { IntentEngine } from "./intelligence/intent.engine";
import { PersonalizationEngine } from "./intelligence/personalization.engine";
import { SuggestionEngine } from "./intelligence/suggestion.engine";

import {
  SearchResult,
  SearchQueryInput,
  RankedSearchResult,
} from "./search.types";

/* -------------------------------------------------------------------------- */
/* INTELLIGENCE SINGLETONS                                                    */
/* -------------------------------------------------------------------------- */

const semanticEngine = new SemanticEngine();
const intentEngine = new IntentEngine();
const personalizationEngine =
  new PersonalizationEngine();
const suggestionEngine = new SuggestionEngine();

/* -------------------------------------------------------------------------- */
/* CONTROLLER                                                                 */
/* -------------------------------------------------------------------------- */

class SearchController {
  /* ====================================================================== */
  /* GLOBAL SEARCH                                                          */
  /* ====================================================================== */

  async search(params: {
    query: string;
    page?: number;
    limit?: number;
    locale?: string;
    geo?: string;
    modules?: string[];
    identityContext?: IdentityContext;
  }): Promise<SearchResult> {
    const startedAt = Date.now();

    const page = params.page ?? 1;
    const limit = params.limit ?? 20;

    /* ------------------------------------------------------------------- */
    /* INTENT & SEMANTIC UNDERSTANDING                                      */
    /* ------------------------------------------------------------------- */

    const intent = await intentEngine.detectIntent({
      text: params.query,
      locale: params.locale,
    });

    const semanticContext =
      await semanticEngine.expandQuery({
        text: params.query,
        intent,
        locale: params.locale,
      });

    /* ------------------------------------------------------------------- */
    /* PERSONALIZATION                                                      */
    /* ------------------------------------------------------------------- */

    const personalization =
      await personalizationEngine.resolve({
        identity: params.identityContext,
        geo: params.geo,
        locale: params.locale,
      });

    /* ------------------------------------------------------------------- */
    /* QUERY BUILDING                                                       */
    /* ------------------------------------------------------------------- */

    const queryInput: SearchQueryInput =
      SearchQueryBuilder.build({
        rawQuery: params.query,
        semanticContext,
        intent,
        personalization,
        modules: params.modules,
        geo: params.geo,
        page,
        limit,
      });

    /* ------------------------------------------------------------------- */
    /* EXECUTION                                                            */
    /* ------------------------------------------------------------------- */

    const rawResults =
      await SearchService.execute(queryInput);

    /* ------------------------------------------------------------------- */
    /* RANKING & SCORING                                                    */
    /* ------------------------------------------------------------------- */

    const rankedResults: RankedSearchResult[] =
      SearchRankEngine.rank({
        results: rawResults.results,
        intent,
        personalization,
      });

    const durationMs =
      Date.now() - startedAt;

    /* ------------------------------------------------------------------- */
    /* NORMALIZATION (CANONICAL RESULT)                                     */
    /* ------------------------------------------------------------------- */

    return {
      query: queryInput,
      total: rawResults.total,
      results: rankedResults,
      tookMs: durationMs,
      suggestions: [],
      facets: rawResults.facets,
      nextCursor: rawResults.nextCursor,
    };
  }

  /* ====================================================================== */
  /* SUGGESTIONS                                                            */
  /* ====================================================================== */

  async suggest(params: {
    query: string;
    locale?: string;
    identityContext?: IdentityContext;
  }): Promise<string[]> {
    return suggestionEngine.suggest({
      text: params.query,
      locale: params.locale,
      identity: params.identityContext,
    });
  }
}

/* -------------------------------------------------------------------------- */
/* SINGLETON EXPORT                                                           */
/* -------------------------------------------------------------------------- */

export const searchController =
  new SearchController();
