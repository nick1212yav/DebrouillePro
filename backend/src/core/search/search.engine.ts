/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE SEARCH — UNIVERSAL SEARCH ENGINE (WORLD #1)                     */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/search/search.engine.ts                             */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  🌍 VISION :                                                               */
/*   - Unifier toutes les sources de données                                  */
/*   - Router intelligemment chaque requête                                   */
/*   - Garantir performance, fiabilité, explicabilité                         */
/*   - IA-native, Offline-first                                               */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import crypto from "crypto";
import { performance } from "perf_hooks";

import {
  SearchQuery,
  SearchResult,
  SearchSource,
  SearchExecutionTrace,
} from "./search.types";

import { SearchQueryBuilder } from "./search.query.builder";

/* -------------------------------------------------------------------------- */
/* EXECUTION CONTEXT                                                          */
/* -------------------------------------------------------------------------- */

type EngineContext = {
  traceId: string;
  startedAt: number;
  sources: SearchSource[];
  offline: boolean;
};

/* -------------------------------------------------------------------------- */
/* SOURCE ADAPTER INTERFACE                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Chaque moteur réel (Mongo, Redis, Elastic, Vector, Offline, API)
 * implémente ce contrat.
 */
export interface SearchSourceAdapter {
  readonly name: SearchSource;
  readonly priority: number;

  isAvailable(): Promise<boolean>;

  execute(
    query: SearchQuery,
    context: EngineContext
  ): Promise<SearchResult[]>;
}

/* -------------------------------------------------------------------------- */
/* ENGINE                                                                     */
/* -------------------------------------------------------------------------- */

export class SearchEngine {
  private static adapters: SearchSourceAdapter[] = [];

  /* ======================================================================== */
  /* REGISTRATION                                                             */
  /* ======================================================================== */

  /**
   * Enregistrer un moteur de recherche.
   */
  static registerAdapter(
    adapter: SearchSourceAdapter
  ) {
    this.adapters.push(adapter);

    this.adapters.sort(
      (a, b) => b.priority - a.priority
    );
  }

  /* ======================================================================== */
  /* EXECUTION                                                                */
  /* ======================================================================== */

  /**
   * Exécuter une recherche intelligente.
   */
  static async search(
    input: Parameters<
      typeof SearchQueryBuilder.build
    >[0]
  ): Promise<{
    results: SearchResult[];
    trace: SearchExecutionTrace;
  }> {
    const query =
      SearchQueryBuilder.build(input);

    const traceId =
      query.traceId || crypto.randomUUID();

    const startedAt = performance.now();

    const context: EngineContext = {
      traceId,
      startedAt,
      sources: [],
      offline: false,
    };

    const executionTrace: SearchExecutionTrace =
      {
        traceId,
        intent: query.intent,
        domains: query.domains,
        startedAt: new Date(),
        sources: [],
        durationMs: 0,
      };

    const availableAdapters: SearchSourceAdapter[] =
      [];

    /* ---------------------------------------------------------------------- */
    /* AVAILABILITY CHECK                                                      */
    /* ---------------------------------------------------------------------- */

    for (const adapter of this.adapters) {
      try {
        const available =
          await adapter.isAvailable();

        if (available) {
          availableAdapters.push(adapter);
        }
      } catch {
        continue;
      }
    }

    if (availableAdapters.length === 0) {
      context.offline = true;
    }

    /* ---------------------------------------------------------------------- */
    /* EXECUTION PIPELINE                                                      */
    /* ---------------------------------------------------------------------- */

    const aggregatedResults: SearchResult[] =
      [];

    for (const adapter of availableAdapters) {
      const sourceStarted =
        performance.now();

      try {
        const partialResults =
          await adapter.execute(
            query,
            context
          );

        aggregatedResults.push(
          ...partialResults
        );

        const duration =
          performance.now() -
          sourceStarted;

        executionTrace.sources.push({
          source: adapter.name,
          durationMs: Math.round(duration),
          count: partialResults.length,
          status: "ok",
        });

        context.sources.push(adapter.name);
      } catch (error) {
        const duration =
          performance.now() -
          sourceStarted;

        executionTrace.sources.push({
          source: adapter.name,
          durationMs: Math.round(duration),
          count: 0,
          status: "error",
        });
      }
    }

    /* ---------------------------------------------------------------------- */
    /* RANKING & DEDUP                                                         */
    /* ---------------------------------------------------------------------- */

    const ranked = this.rankResults(
      aggregatedResults
    );

    /* ---------------------------------------------------------------------- */
    /* TRACE FINAL                                                             */
    /* ---------------------------------------------------------------------- */

    executionTrace.durationMs =
      Math.round(performance.now() - startedAt);

    return {
      results: ranked,
      trace: executionTrace,
    };
  }

  /* ======================================================================== */
  /* RANKING ENGINE                                                           */
  /* ======================================================================== */

  /**
   * Fusion intelligente et déduplication.
   */
  private static rankResults(
    results: SearchResult[]
  ): SearchResult[] {
    const unique = new Map<string, SearchResult>();

    for (const r of results) {
      if (!unique.has(r.id)) {
        unique.set(r.id, r);
      } else {
        const existing = unique.get(r.id)!;
        if (r.score > existing.score) {
          unique.set(r.id, r);
        }
      }
    }

    return Array.from(unique.values()).sort(
      (a, b) => b.score - a.score
    );
  }
}
