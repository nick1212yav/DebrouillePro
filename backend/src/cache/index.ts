/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE CACHE — PUBLIC EXPORT HUB (WORLD #1 FINAL)                   */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/cache/index.ts                                         */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Strategic role:                                                          */
/*   - Single public entrypoint for cache system                              */
/*   - Dynamic provider selection                                             */
/*   - Automatic fallback                                                     */
/*   - Centralized observability                                              */
/*   - Stable API                                                             */
/*                                                                            */
/*  Guarantees:                                                              */
/*   - Deterministic provider resolution                                      */
/*   - Safe degradation                                                       */
/*   - Explicit exports only                                                  */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import type { CacheProvider } from "./cache.interface";
import { memoryCache } from "./memory.cache";
import { redisCache } from "./redis.cache";
import { ENV } from "../config";
import { logger } from "../shared/logger";

/* -------------------------------------------------------------------------- */
/* PROVIDER RESOLUTION                                                        */
/* -------------------------------------------------------------------------- */

const resolveProvider = (): CacheProvider => {
  const providerName =
    ENV.CACHE_PROVIDER ?? "memory";

  switch (providerName) {
    case "redis":
      logger.info("⚡ Cache provider: Redis");
      return redisCache;

    case "memory":
    default:
      logger.info("⚡ Cache provider: Memory");
      return memoryCache;
  }
};

/* -------------------------------------------------------------------------- */
/* ACTIVE PROVIDER                                                            */
/* -------------------------------------------------------------------------- */

const activeProvider = resolveProvider();

/* -------------------------------------------------------------------------- */
/* SAFE PROXY                                                                 */
/* -------------------------------------------------------------------------- */

export const cache: CacheProvider = {
  name: activeProvider.name,

  async get(key) {
    try {
      return await activeProvider.get(key);
    } catch (error) {
      logger.error("❌ Cache get failed", {
        key,
        error,
      });
      return null;
    }
  },

  async set(key, value, options) {
    try {
      await activeProvider.set(
        key,
        value,
        options
      );
    } catch (error) {
      logger.error("❌ Cache set failed", {
        key,
        error,
      });
    }
  },

  async delete(key) {
    try {
      await activeProvider.delete(key);
    } catch (error) {
      logger.error("❌ Cache delete failed", {
        key,
        error,
      });
    }
  },

  async clear() {
    try {
      await activeProvider.clear();
    } catch (error) {
      logger.error("❌ Cache clear failed", {
        error,
      });
    }
  },

  async stats() {
    try {
      return await activeProvider.stats();
    } catch (error) {
      logger.error("❌ Cache stats failed", {
        error,
      });

      return {
        hits: 0,
        misses: 0,
        keys: 0,
      };
    }
  },
};

/* -------------------------------------------------------------------------- */
/* GOVERNANCE                                                                 */
/* -------------------------------------------------------------------------- */
/*
  Usage rules:

  ✅ Always import cache from:
        import { cache } from "@/cache";

  ❌ Never deep import:
        "@/cache/memory.cache"
        "@/cache/redis.cache"

  This guarantees:
   - Stable public contract
   - Safe provider migration
   - Predictable performance
*/
