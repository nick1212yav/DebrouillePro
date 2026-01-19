/* -------------------------------------------------------------------------- */
/*  CORE / GEO — IP PROVIDER                                                   */
/*  File: core/geo/providers/ip.provider.ts                                   */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  🌐 Network Based • Cache Friendly • Offline Tolerant • Observable          */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  GeoResolver,
  GeoResolverContext,
  GeoResolverObserver,
} from "../geo.resolver.interface";

import {
  GeoResolveResult,
  GeoCoordinates,
} from "../geo.types";

import { GeoPointEntity } from "../geo.point.model";

/* -------------------------------------------------------------------------- */
/* 🧱 ERREURS                                                                  */
/* -------------------------------------------------------------------------- */

export class IPProviderError extends Error {
  constructor(message: string) {
    super(`[IPProvider] ${message}`);
  }
}

/* -------------------------------------------------------------------------- */
/* 🌐 IP GEO API INTERFACE                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Abstraction d’un service IP → Geo.
 * Peut être implémenté via HTTP, SDK, mock, edge gateway.
 */
export interface IPGeoAPI {
  resolve(): Promise<{
    latitude: number;
    longitude: number;
    accuracyMeters?: number;
    country?: string;
    city?: string;
    region?: string;
  }>;
}

/* -------------------------------------------------------------------------- */
/* 🌐 IP GEO PROVIDER                                                          */
/* -------------------------------------------------------------------------- */

export class IPGeoProvider implements GeoResolver {
  readonly id = "ip";

  constructor(
    private readonly api?: IPGeoAPI,
    private readonly timeoutMs: number = 5_000
  ) {}

  /* ------------------------------------------------------------------------ */
  /* 🧭 RESOLVE                                                                */
  /* ------------------------------------------------------------------------ */

  async resolve(
    _context: GeoResolverContext,
    observer?: GeoResolverObserver
  ): Promise<GeoResolveResult | null> {
    observer?.onResolveStart?.();

    if (!this.api) {
      const error = new IPProviderError(
        "IP Geo API not available"
      );
      observer?.onResolveError?.(error);
      return null;
    }

    try {
      const data = await this.withTimeout(
        this.api.resolve(),
        this.timeoutMs
      );

      const coords: GeoCoordinates = {
        latitude: data.latitude,
        longitude: data.longitude,
        accuracyMeters: data.accuracyMeters,
      };

      const point = GeoPointEntity.create({
        id: `ip:${Date.now()}`,
        coordinates: coords,
        source: "ip",
        accuracyScore: data.accuracyMeters
          ? Math.max(
              0,
              1 - data.accuracyMeters / 50_000
            )
          : 0.5,
      });

      const result: GeoResolveResult = {
        point: point.snapshot,
        geohash: point.geohash,
        address: {
          country: data.country,
          city: data.city,
          region: data.region,
        },
      };

      observer?.onResolveSuccess?.(result);
      return result;
    } catch (err: any) {
      observer?.onResolveError?.(err);
      return null;
    }
  }

  /* ------------------------------------------------------------------------ */
  /* 🩺 HEALTH                                                                 */
  /* ------------------------------------------------------------------------ */

  async healthCheck(): Promise<boolean> {
    return Boolean(this.api);
  }

  /* ------------------------------------------------------------------------ */
  /* 🧠 INTERNALS                                                              */
  /* ------------------------------------------------------------------------ */

  private async withTimeout<T>(
    promise: Promise<T>,
    ms: number
  ): Promise<T> {
    let timer: any;

    return Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(
            new IPProviderError("Timeout")
          );
        }, ms);
      }),
    ]).finally(() => clearTimeout(timer));
  }
}
