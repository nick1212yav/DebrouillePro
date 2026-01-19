/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE SEARCH — SEARCH SERVICE (WORLD #1 ORCHESTRATOR)               */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/search/search.service.ts                          */
/* -------------------------------------------------------------------------- */

import {
  SearchQueryInput,
  SearchRawResult,
  SearchEngineName,
} from "./search.types";

import { SearchAdapter } from "./adapters/adapter.interface";

import { ElasticSearchAdapter } from "./adapters/elastic.adapter";
import { MeilisearchAdapter } from "./adapters/meilisearch.adapter";
import { PostgresAdapter } from "./adapters/postgres.adapter";
import { MemoryAdapter } from "./adapters/memory.adapter";

/* -------------------------------------------------------------------------- */
/* ENGINE REGISTRY                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Ordre de priorité des moteurs.
 * ⚠️ Doit respecter SearchEngineName.
 */
const ENGINE_PRIORITY: SearchEngineName[] = [
  "elastic",
  "meilisearch",
  "postgres",
  "memory",
];

/**
 * Instances locales des adapters.
 * Le registry global (index.ts) gère aussi sa propre orchestration.
 */
const ADAPTERS: Partial<
  Record<SearchEngineName, SearchAdapter>
> = {
  elastic: new ElasticSearchAdapter(),
  meilisearch: new MeilisearchAdapter(),
  postgres: new PostgresAdapter(),
  memory: new MemoryAdapter(),
};

/* -------------------------------------------------------------------------- */
/* HEALTH & CIRCUIT BREAKER                                                   */
/* -------------------------------------------------------------------------- */

type EngineHealth = {
  failures: number;
  lastFailureAt?: number;
  averageLatencyMs: number;
  successCount: number;
};

const engineHealth: Partial<
  Record<SearchEngineName, EngineHealth>
> = {
  elastic: {
    failures: 0,
    averageLatencyMs: 0,
    successCount: 0,
  },
  meilisearch: {
    failures: 0,
    averageLatencyMs: 0,
    successCount: 0,
  },
  postgres: {
    failures: 0,
    averageLatencyMs: 0,
    successCount: 0,
  },
  memory: {
    failures: 0,
    averageLatencyMs: 0,
    successCount: 0,
  },
};

const MAX_FAILURES = 3;
const COOLDOWN_MS = 30_000;

/* -------------------------------------------------------------------------- */
/* INTERNAL HELPERS                                                           */
/* -------------------------------------------------------------------------- */

const getHealth = (
  engine: SearchEngineName
): EngineHealth => {
  const health = engineHealth[engine];
  if (!health) {
    throw new Error(
      `Health registry missing for engine: ${engine}`
    );
  }
  return health;
};

const getAdapter = (
  engine: SearchEngineName
): SearchAdapter => {
  const adapter = ADAPTERS[engine];
  if (!adapter) {
    throw new Error(
      `Adapter not registered for engine: ${engine}`
    );
  }
  return adapter;
};

const isEngineAvailable = (
  engine: SearchEngineName
): boolean => {
  const health = getHealth(engine);

  if (health.failures < MAX_FAILURES) {
    return true;
  }

  if (
    health.lastFailureAt &&
    Date.now() - health.lastFailureAt >
      COOLDOWN_MS
  ) {
    // auto-healing
    health.failures = 0;
    return true;
  }

  return false;
};

const updateHealthSuccess = (
  engine: SearchEngineName,
  latencyMs: number
): void => {
  const health = getHealth(engine);

  health.successCount++;
  health.averageLatencyMs =
    health.averageLatencyMs === 0
      ? latencyMs
      : Math.round(
          (health.averageLatencyMs + latencyMs) / 2
        );
};

const updateHealthFailure = (
  engine: SearchEngineName
): void => {
  const health = getHealth(engine);
  health.failures++;
  health.lastFailureAt = Date.now();
};

/* -------------------------------------------------------------------------- */
/* SEARCH SERVICE                                                             */
/* -------------------------------------------------------------------------- */

export class SearchService {
  /* ====================================================================== */
  /* EXECUTION                                                              */
  /* ====================================================================== */

  static async execute(
    query: SearchQueryInput
  ): Promise<SearchRawResult> {
    const engines = ENGINE_PRIORITY.filter(
      isEngineAvailable
    );

    if (!engines.length) {
      throw new Error(
        "No search engine available"
      );
    }

    let lastError: Error | null = null;

    for (const engine of engines) {
      const adapter = getAdapter(engine);
      const startedAt = Date.now();

      try {
        const result =
          await adapter.search(query);

        updateHealthSuccess(
          engine,
          Date.now() - startedAt
        );

        return result;
      } catch (err) {
        updateHealthFailure(engine);

        lastError =
          err instanceof Error
            ? err
            : new Error("Search execution failed");

        // fallback → continue
      }
    }

    throw (
      lastError ??
      new Error("All search engines failed")
    );
  }

  /* ====================================================================== */
  /* PARALLEL EXECUTION (R&D MODE)                                           */
  /* ====================================================================== */

  static async executeParallel(
    query: SearchQueryInput
  ): Promise<SearchRawResult> {
    const engines = ENGINE_PRIORITY.filter(
      isEngineAvailable
    );

    const tasks = engines.map((engine) => {
      const adapter = getAdapter(engine);
      const startedAt = Date.now();

      return adapter
        .search(query)
        .then((result) => {
          updateHealthSuccess(
            engine,
            Date.now() - startedAt
          );
          return result;
        })
        .catch(() => {
          updateHealthFailure(engine);
          return null;
        });
    });

    const results = await Promise.all(tasks);

    const validResults = results.filter(
      (r): r is SearchRawResult => r !== null
    );

    if (!validResults.length) {
      throw new Error(
        "All search engines failed"
      );
    }

    // Strategy simple (first healthy result)
    return validResults[0];
  }
}
