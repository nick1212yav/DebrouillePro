/* -------------------------------------------------------------------------- */
/*  CORE / GEO — OFFLINE PROVIDER                                              */
/*  File: core/geo/providers/offline.provider.ts                              */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  📴 Cache First • Networkless • Edge Ready • Observable                     */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  GeoResolver,
  GeoResolverContext,
  GeoResolverObserver,
} from "../geo.resolver.interface";

import {
  GeoResolveResult,
} from "../geo.types";

import { GeoCache } from "../geo.cache.interface";

/* -------------------------------------------------------------------------- */
/* 🧱 ERREURS                                                                  */
/* -------------------------------------------------------------------------- */

export class OfflineGeoProviderError extends Error {
  constructor(message: string) {
    super(`[OfflineGeoProvider] ${message}`);
  }
}

/* -------------------------------------------------------------------------- */
/* 📴 OFFLINE GEO PROVIDER                                                     */
/* -------------------------------------------------------------------------- */

export class OfflineGeoProvider implements GeoResolver {
  readonly id = "offline";

  constructor(
    private readonly cache: GeoCache
  ) {}

  /* ------------------------------------------------------------------------ */
  /* 🧭 RESOLVE                                                                */
  /* ------------------------------------------------------------------------ */

  async resolve(
    context: GeoResolverContext,
    observer?: GeoResolverObserver
  ): Promise<GeoResolveResult | null> {
    observer?.onResolveStart?.();

    try {
      const cached = await this.cache.get(
        context.resolverId
      );

      if (!cached) {
        observer?.onResolveError?.(
          new OfflineGeoProviderError(
            "No cached geo data available"
          )
        );
        return null;
      }

      observer?.onResolveSuccess?.(cached.value);
      return cached.value;
    } catch (err: any) {
      observer?.onResolveError?.(err);
      return null;
    }
  }

  /* ------------------------------------------------------------------------ */
  /* 🩺 HEALTH                                                                 */
  /* ------------------------------------------------------------------------ */

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
