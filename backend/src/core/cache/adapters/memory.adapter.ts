/* -------------------------------------------------------------------------- */
/*  CORE / CACHE — MEMORY ADAPTER                                              */
/*  File: core/cache/adapters/memory.adapter.ts                               */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  ⚡ Ultra Fast • TTL • Eviction • Observable • Zero Dependency               */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  CacheAdapter,
  CacheAdapterContext,
} from "../cache.adapter.interface";

import {
  CacheKey,
  CacheValue,
  CacheStats,
} from "../cache.types";

/* -------------------------------------------------------------------------- */
/* 🧱 ERREURS                                                                  */
/* -------------------------------------------------------------------------- */

export class MemoryCacheAdapterError extends Error {
  constructor(message: string) {
    super(`[MemoryCacheAdapter] ${message}`);
  }
}

/* -------------------------------------------------------------------------- */
/* ⚡ MEMORY CACHE ADAPTER                                                     */
/* -------------------------------------------------------------------------- */

export class MemoryCacheAdapter implements CacheAdapter {
  readonly id = "memory";

  private readonly store = new Map<
    CacheKey,
    CacheValue<any>
  >();

  private readonly accessOrder: CacheKey[] = [];

  private readonly stats: CacheStats = {
    hits: 0,
    misses: 0,
    entries: 0,
  };

  /* ------------------------------------------------------------------------ */
  /* 📥 GET                                                                    */
  /* ------------------------------------------------------------------------ */

  async get<T>(
    key: CacheKey
  ): Promise<CacheValue<T> | null> {
    const entry = this.store.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (
      entry.metadata.expiresAt &&
      Date.now() >= entry.metadata.expiresAt
    ) {
      this.store.delete(key);
      this.stats.entries--;
      return null;
    }

    this.stats.hits++;
    this.touch(key);
    return entry as CacheValue<T>;
  }

  /* ------------------------------------------------------------------------ */
  /* 📤 SET                                                                    */
  /* ------------------------------------------------------------------------ */

  async set<T>(
    key: CacheKey,
    value: CacheValue<T>
  ): Promise<void> {
    this.store.set(key, value);
    this.stats.entries = this.store.size;
    this.touch(key);
  }

  /* ------------------------------------------------------------------------ */
  /* ❌ DELETE                                                                 */
  /* ------------------------------------------------------------------------ */

  async delete(key: CacheKey): Promise<void> {
    this.store.delete(key);
    this.stats.entries = this.store.size;
  }

  /* ------------------------------------------------------------------------ */
  /* 🧹 CLEAR                                                                  */
  /* ------------------------------------------------------------------------ */

  async clear(): Promise<void> {
    this.store.clear();
    this.accessOrder.length = 0;
    this.stats.entries = 0;
  }

  /* ------------------------------------------------------------------------ */
  /* 📊 STATS                                                                  */
  /* ------------------------------------------------------------------------ */

  async stats(): Promise<CacheStats> {
    return { ...this.stats };
  }

  /* ------------------------------------------------------------------------ */
  /* 🧠 INTERNALS                                                              */
  /* ------------------------------------------------------------------------ */

  private touch(key: CacheKey) {
    const index = this.accessOrder.indexOf(key);
    if (index >= 0) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }
}
