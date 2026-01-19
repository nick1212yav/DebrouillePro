/* -------------------------------------------------------------------------- */
/*  CORE / CACHE — REDIS ADAPTER                                               */
/*  File: core/cache/adapters/redis.adapter.ts                                */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  🚀 Distributed • TTL Native • Resilient • Observable • Vendor Free         */
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

export class RedisCacheAdapterError extends Error {
  constructor(message: string) {
    super(`[RedisCacheAdapter] ${message}`);
  }
}

/* -------------------------------------------------------------------------- */
/* 🔌 REDIS CLIENT ABSTRACTION                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Interface minimale compatible avec ioredis, node-redis, edge gateway, mock.
 */
export interface RedisLikeClient {
  connect?(): Promise<void>;
  disconnect?(): Promise<void>;

  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
    mode?: "PX",
    ttlMs?: number
  ): Promise<void>;

  del(key: string): Promise<void>;
  flushdb?(): Promise<void>;
}

/* -------------------------------------------------------------------------- */
/* 🚀 REDIS CACHE ADAPTER                                                      */
/* -------------------------------------------------------------------------- */

export class RedisCacheAdapter implements CacheAdapter {
  readonly id = "redis";

  private readonly stats: CacheStats = {
    hits: 0,
    misses: 0,
    entries: 0,
  };

  constructor(
    private readonly client: RedisLikeClient,
    private readonly namespace: string = "cache"
  ) {}

  /* ------------------------------------------------------------------------ */
  /* 🔌 LIFECYCLE                                                              */
  /* ------------------------------------------------------------------------ */

  async connect(): Promise<void> {
    try {
      await this.client.connect?.();
    } catch (err) {
      throw new RedisCacheAdapterError(
        "Failed to connect to Redis"
      );
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.disconnect?.();
    } catch {
      // silent
    }
  }

  /* ------------------------------------------------------------------------ */
  /* 📥 GET                                                                    */
  /* ------------------------------------------------------------------------ */

  async get<T>(
    key: CacheKey,
    context?: CacheAdapterContext
  ): Promise<CacheValue<T> | null> {
    const redisKey = this.buildKey(key, context);

    try {
      const raw = await this.client.get(redisKey);

      if (!raw) {
        this.stats.misses++;
        return null;
      }

      const parsed = JSON.parse(raw) as CacheValue<T>;

      // TTL safety check (Redis TTL may drift on restore)
      if (
        parsed.metadata.expiresAt &&
        Date.now() >= parsed.metadata.expiresAt
      ) {
        await this.delete(key, context);
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return parsed;
    } catch (err) {
      throw new RedisCacheAdapterError(
        `GET failed for key=${redisKey}`
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* 📤 SET                                                                    */
  /* ------------------------------------------------------------------------ */

  async set<T>(
    key: CacheKey,
    value: CacheValue<T>,
    context?: CacheAdapterContext
  ): Promise<void> {
    const redisKey = this.buildKey(key, context);

    try {
      const serialized = JSON.stringify(value);

      const ttlMs =
        value.metadata.expiresAt &&
        value.metadata.expiresAt > Date.now()
          ? value.metadata.expiresAt -
            Date.now()
          : undefined;

      if (ttlMs && ttlMs > 0) {
        await this.client.set(
          redisKey,
          serialized,
          "PX",
          ttlMs
        );
      } else {
        await this.client.set(redisKey, serialized);
      }

      this.stats.entries++;
    } catch (err) {
      throw new RedisCacheAdapterError(
        `SET failed for key=${redisKey}`
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* ❌ DELETE                                                                 */
  /* ------------------------------------------------------------------------ */

  async delete(
    key: CacheKey,
    context?: CacheAdapterContext
  ): Promise<void> {
    const redisKey = this.buildKey(key, context);

    try {
      await this.client.del(redisKey);
      this.stats.entries = Math.max(
        0,
        this.stats.entries - 1
      );
    } catch (err) {
      throw new RedisCacheAdapterError(
        `DELETE failed for key=${redisKey}`
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* 🧹 CLEAR                                                                  */
  /* ------------------------------------------------------------------------ */

  async clear(): Promise<void> {
    try {
      await this.client.flushdb?.();
      this.stats.entries = 0;
    } catch (err) {
      throw new RedisCacheAdapterError(
        "FLUSH failed"
      );
    }
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

  private buildKey(
    key: CacheKey,
    context?: CacheAdapterContext
  ): string {
    const ns =
      context?.namespace ?? this.namespace;
    return `${ns}:${key}`;
  }
}
