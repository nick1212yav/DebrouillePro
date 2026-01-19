/* -------------------------------------------------------------------------- */
/*  CORE / CACHE — CACHE SERVICE                                              */
/*  File: core/cache/cache.service.ts                                         */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  🧠 Multi-Adapters • Policy Engine • Offline • Observable • Planet Scale    */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  CacheKey,
  CacheStats,
  CacheEvent,
  CacheEventType,
  CacheAdapterID,
} from "./cache.types";

import {
  CacheAdapter,
  CacheAdapterObserver,
} from "./cache.adapter.interface";

import { CacheEntry } from "./cache.entry.model";
import { CachePolicyEngine } from "./cache.policy";

/* -------------------------------------------------------------------------- */
/* 🧱 ERREURS                                                                  */
/* -------------------------------------------------------------------------- */

export class CacheServiceError extends Error {
  constructor(message: string) {
    super(`[CacheService] ${message}`);
  }
}

/* -------------------------------------------------------------------------- */
/* 🔭 OBSERVER                                                                 */
/* -------------------------------------------------------------------------- */

export interface CacheServiceObserver {
  onEvent?(event: CacheEvent): void;
}

/* -------------------------------------------------------------------------- */
/* ⚙️ CONFIG                                                                   */
/* -------------------------------------------------------------------------- */

export interface CacheServiceConfig {
  primaryAdapter: CacheAdapter;
  secondaryAdapters?: CacheAdapter[];
  policy?: CachePolicyEngine;
  observer?: CacheServiceObserver;
}

/* -------------------------------------------------------------------------- */
/* 🧠 CACHE SERVICE                                                            */
/* -------------------------------------------------------------------------- */

export class CacheService {
  private readonly adapters: CacheAdapter[];
  private readonly policy: CachePolicyEngine;
  private readonly observer?: CacheServiceObserver;

  private readonly stats: CacheStats = {
    hits: 0,
    misses: 0,
    entries: 0,
  };

  constructor(config: CacheServiceConfig) {
    this.adapters = [
      config.primaryAdapter,
      ...(config.secondaryAdapters ?? []),
    ];
    this.policy =
      config.policy ?? new CachePolicyEngine();
    this.observer = config.observer;
  }

  /* ------------------------------------------------------------------------ */
  /* 🔌 LIFECYCLE                                                              */
  /* ------------------------------------------------------------------------ */

  async connect(): Promise<void> {
    for (const adapter of this.adapters) {
      await adapter.connect?.();
    }
  }

  async disconnect(): Promise<void> {
    for (const adapter of this.adapters) {
      await adapter.disconnect?.();
    }
  }

  /* ------------------------------------------------------------------------ */
  /* 📥 GET                                                                    */
  /* ------------------------------------------------------------------------ */

  async get<T>(key: CacheKey): Promise<T | null> {
    for (const adapter of this.adapters) {
      try {
        const value = await adapter.get<T>(key);

        if (value) {
          this.stats.hits++;
          this.emit("hit", key, adapter.id);
          return value.data;
        }
      } catch (err) {
        this.emit("error", key, adapter.id, err);
      }
    }

    this.stats.misses++;
    this.emit("miss", key);
    return null;
  }

  /* ------------------------------------------------------------------------ */
  /* 📤 SET                                                                    */
  /* ------------------------------------------------------------------------ */

  async set<T>(
    entry: CacheEntry<T>
  ): Promise<void> {
    for (const adapter of this.adapters) {
      try {
        await adapter.set(
          entry.key,
          entry.snapshot()
        );
      } catch (err) {
        this.emit("error", entry.key, adapter.id, err);
      }
    }

    this.stats.entries++;
    this.emit("set", entry.key);
  }

  /* ------------------------------------------------------------------------ */
  /* ❌ DELETE                                                                 */
  /* ------------------------------------------------------------------------ */

  async delete(key: CacheKey): Promise<void> {
    for (const adapter of this.adapters) {
      try {
        await adapter.delete(key);
      } catch (err) {
        this.emit("error", key, adapter.id, err);
      }
    }

    this.stats.entries = Math.max(
      0,
      this.stats.entries - 1
    );
    this.emit("delete", key);
  }

  /* ------------------------------------------------------------------------ */
  /* 🧹 FLUSH                                                                  */
  /* ------------------------------------------------------------------------ */

  async flush(): Promise<void> {
    for (const adapter of this.adapters) {
      try {
        await adapter.clear?.();
      } catch (err) {
        this.emit("error", undefined, adapter.id, err);
      }
    }

    this.stats.entries = 0;
    this.stats.lastFlushAt = Date.now();
    this.emit("flush");
  }

  /* ------------------------------------------------------------------------ */
  /* 📊 STATS                                                                  */
  /* ------------------------------------------------------------------------ */

  getStats(): CacheStats {
    return { ...this.stats };
  }

  /* ------------------------------------------------------------------------ */
  /* 🧭 INTERNAL EVENT                                                         */
  /* ------------------------------------------------------------------------ */

  private emit(
    type: CacheEventType,
    key?: CacheKey,
    adapter?: CacheAdapterID,
    error?: any
  ) {
    const event: CacheEvent = {
      type,
      key,
      adapter,
      timestamp: Date.now(),
      details: error
        ? { error: String(error) }
        : undefined,
    };

    this.observer?.onEvent?.(event);
  }
}
