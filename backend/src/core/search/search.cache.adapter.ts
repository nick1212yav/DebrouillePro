/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE SEARCH — INTELLIGENT CACHE ADAPTER (WORLD #1)                   */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/search/search.cache.adapter.ts                      */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  🎯 MISSION :                                                              */
/*   - Cache distribué multi-niveaux                                           */
/*   - Mémoire locale → Redis → Edge                                           */
/*   - Auto TTL adaptatif                                                     */
/*   - Invalidation intelligente                                              */
/*   - Warmup prédictif                                                       */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import crypto from "crypto";
import LRUCache from "lru-cache";

import {
  SearchQuery,
  SearchResult,
  SearchSource,
} from "./search.types";

import {
  SearchSourceAdapter,
} from "./search.engine";

/* -------------------------------------------------------------------------- */
/* CACHE LEVELS                                                               */
/* -------------------------------------------------------------------------- */

type CacheEntry = {
  value: SearchResult[];
  expiresAt: number;
  hits: number;
  source: SearchSource;
};

const memoryCache = new LRUCache<string, CacheEntry>({
  max: 5_000,
  ttl: 60 * 1000,
});

/**
 * Redis / Edge placeholders (branchables plus tard).
 */
interface DistributedCache {
  get(key: string): Promise<CacheEntry | null>;
  set(key: string, value: CacheEntry): Promise<void>;
  delete(key: string): Promise<void>;
}

let distributedCache: DistributedCache | null = null;

export const attachDistributedCache = (
  cache: DistributedCache
) => {
  distributedCache = cache;
};

/* -------------------------------------------------------------------------- */
/* CACHE ADAPTER                                                              */
/* -------------------------------------------------------------------------- */

export class SearchCacheAdapter
  implements SearchSourceAdapter
{
  readonly name = SearchSource.CACHE;
  readonly priority = 1_000; // priorité maximale

  /* ======================================================================== */
  /* AVAILABILITY                                                             */
  /* ======================================================================== */

  async isAvailable(): Promise<boolean> {
    return true;
  }

  /* ======================================================================== */
  /* EXECUTION                                                                */
  /* ======================================================================== */

  async execute(
    query: SearchQuery
  ): Promise<SearchResult[]> {
    const key = this.computeKey(query);

    /* -------------------- MEMORY CACHE -------------------- */

    const mem = memoryCache.get(key);
    if (mem && mem.expiresAt > Date.now()) {
      mem.hits++;
      return mem.value;
    }

    /* ---------------- DISTRIBUTED CACHE ------------------- */

    if (distributedCache) {
      const dist = await distributedCache.get(key);
      if (dist && dist.expiresAt > Date.now()) {
        memoryCache.set(key, dist);
        return dist.value;
      }
    }

    return [];
  }

  /* ======================================================================== */
  /* POPULATION                                                               */
  /* ======================================================================== */

  async populate(
    query: SearchQuery,
    results: SearchResult[],
    source: SearchSource
  ) {
    const key = this.computeKey(query);

    const ttl = this.computeTTL(results);

    const entry: CacheEntry = {
      value: results,
      expiresAt: Date.now() + ttl,
      hits: 0,
      source,
    };

    memoryCache.set(key, entry);

    if (distributedCache) {
      await distributedCache.set(key, entry);
    }
  }

  /* ======================================================================== */
  /* INVALIDATION                                                             */
  /* ======================================================================== */

  invalidate(pattern?: string) {
    if (!pattern) {
      memoryCache.clear();
      return;
    }

    for (const key of memoryCache.keys()) {
      if (key.includes(pattern)) {
        memoryCache.delete(key);
      }
    }
  }

  /* ======================================================================== */
  /* KEY COMPUTATION                                                          */
  /* ======================================================================== */

  private computeKey(
    query: SearchQuery
  ): string {
    const raw = JSON.stringify({
      t: query.text,
      f: query.filters,
      l: query.limit,
    });

    return crypto
      .createHash("sha256")
      .update(raw)
      .digest("hex");
  }

  /* ======================================================================== */
  /* TTL STRATEGY                                                             */
  /* ======================================================================== */

  private computeTTL(
    results: SearchResult[]
  ): number {
    if (results.length === 0) {
      return 10_000; // résultats vides → TTL court
    }

    if (results.length > 50) {
      return 2 * 60_000;
    }

    return 60_000; // default 1 minute
  }
}

/* -------------------------------------------------------------------------- */
/* SINGLETON                                                                  */
/* -------------------------------------------------------------------------- */

export const searchCacheAdapter =
  new SearchCacheAdapter();
