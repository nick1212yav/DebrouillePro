/* -------------------------------------------------------------------------- */
/*  CORE / GEO — GPS PROVIDER                                                  */
/*  File: core/geo/providers/gps.provider.ts                                  */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  📡 High Precision • Edge Ready • Offline Safe • Observable                 */
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

export class GPSProviderError extends Error {
  constructor(message: string) {
    super(`[GPSProvider] ${message}`);
  }
}

/* -------------------------------------------------------------------------- */
/* 🛰️ GEOLOCATION BRIDGE TYPES                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Interface minimale compatible navigateur, mobile bridge ou mock serveur.
 */
export interface GeolocationLike {
  getCurrentPosition(
    success: (pos: {
      coords: {
        latitude: number;
        longitude: number;
        altitude?: number | null;
        accuracy?: number | null;
        heading?: number | null;
        speed?: number | null;
      };
      timestamp?: number;
    }) => void,
    error?: (err: { message?: string }) => void,
    options?: {
      enableHighAccuracy?: boolean;
      timeout?: number;
      maximumAge?: number;
    }
  ): void;
}

/* -------------------------------------------------------------------------- */
/* 📡 GPS PROVIDER                                                             */
/* -------------------------------------------------------------------------- */

export class GPSGeoProvider implements GeoResolver {
  readonly id = "gps";

  constructor(
    private readonly geolocation?: GeolocationLike,
    private readonly defaultTimeoutMs: number = 10_000
  ) {}

  /* ------------------------------------------------------------------------ */
  /* 🧭 RESOLVE                                                                */
  /* ------------------------------------------------------------------------ */

  async resolve(
    context: GeoResolverContext,
    observer?: GeoResolverObserver
  ): Promise<GeoResolveResult | null> {
    observer?.onResolveStart?.();

    if (!this.geolocation) {
      const error = new GPSProviderError(
        "Geolocation bridge not available"
      );
      observer?.onResolveError?.(error);
      return null;
    }

    try {
      const coords = await this.acquirePosition();

      const point = GeoPointEntity.create({
        id: `gps:${Date.now()}`,
        coordinates: coords,
        source: "gps",
      });

      const result: GeoResolveResult = {
        point: point.snapshot,
        geohash: point.geohash,
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
    return Boolean(this.geolocation);
  }

  /* ------------------------------------------------------------------------ */
  /* 🧠 INTERNALS                                                              */
  /* ------------------------------------------------------------------------ */

  private acquirePosition(): Promise<GeoCoordinates> {
    return new Promise((resolve, reject) => {
      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          reject(
            new GPSProviderError("GPS timeout")
          );
        }
      }, this.defaultTimeoutMs);

      this.geolocation!.getCurrentPosition(
        (pos) => {
          resolved = true;
          clearTimeout(timeout);

          const coords: GeoCoordinates = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            altitude:
              pos.coords.altitude ?? undefined,
            accuracyMeters:
              pos.coords.accuracy ?? undefined,
            headingDegrees:
              pos.coords.heading ?? undefined,
            speedMetersPerSec:
              pos.coords.speed ?? undefined,
          };

          resolve(coords);
        },
        (err) => {
          clearTimeout(timeout);
          reject(
            new GPSProviderError(
              err.message ?? "GPS error"
            )
          );
        },
        {
          enableHighAccuracy: true,
          timeout: this.defaultTimeoutMs,
          maximumAge: 1_000,
        }
      );
    });
  }
}
