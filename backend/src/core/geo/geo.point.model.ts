/* -------------------------------------------------------------------------- */
/*  CORE / GEO — GEO POINT MODEL                                               */
/*  File: core/geo/geo.point.model.ts                                         */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  📍 Immutable • Geodesic Safe • Auditable • Offline Ready                   */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  GeoCoordinates,
  GeoDatum,
  GeoPointSnapshot,
  GeoHash,
  Degrees,
  Meters,
  EpochMillis,
} from "./geo.types";

/* -------------------------------------------------------------------------- */
/* 🧱 ERREURS                                                                  */
/* -------------------------------------------------------------------------- */

export class GeoPointError extends Error {
  constructor(message: string) {
    super(`[GeoPoint] ${message}`);
  }
}

/* -------------------------------------------------------------------------- */
/* 🌐 CONSTANTS                                                                */
/* -------------------------------------------------------------------------- */

const EARTH_RADIUS_METERS = 6_371_000;

/* -------------------------------------------------------------------------- */
/* 🧠 INTERNAL UTILITIES                                                       */
/* -------------------------------------------------------------------------- */

function now(): EpochMillis {
  return Date.now();
}

function toRadians(deg: Degrees): number {
  return (deg * Math.PI) / 180;
}

function clamp(
  value: number,
  min: number,
  max: number
): number {
  return Math.min(max, Math.max(min, value));
}

/* -------------------------------------------------------------------------- */
/* 🧬 GEOHASH (LIGHTWEIGHT IMPLEMENTATION)                                     */
/* -------------------------------------------------------------------------- */

const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

function encodeGeoHash(
  lat: number,
  lon: number,
  precision: number = 9
): GeoHash {
  let idx = 0;
  let bit = 0;
  let evenBit = true;
  let geohash = "";

  let latMin = -90,
    latMax = 90;
  let lonMin = -180,
    lonMax = 180;

  while (geohash.length < precision) {
    if (evenBit) {
      const mid = (lonMin + lonMax) / 2;
      if (lon >= mid) {
        idx = (idx << 1) + 1;
        lonMin = mid;
      } else {
        idx = idx << 1;
        lonMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) {
        idx = (idx << 1) + 1;
        latMin = mid;
      } else {
        idx = idx << 1;
        latMax = mid;
      }
    }

    evenBit = !evenBit;
    bit++;

    if (bit === 5) {
      geohash += BASE32.charAt(idx);
      bit = 0;
      idx = 0;
    }
  }

  return geohash;
}

/* -------------------------------------------------------------------------- */
/* 📍 GEO POINT ENTITY                                                         */
/* -------------------------------------------------------------------------- */

export class GeoPointEntity {
  readonly snapshot: GeoPointSnapshot;
  readonly geohash: GeoHash;

  private constructor(snapshot: GeoPointSnapshot) {
    this.snapshot = Object.freeze(snapshot);
    this.geohash = encodeGeoHash(
      snapshot.coordinates.latitude,
      snapshot.coordinates.longitude
    );
  }

  /* ------------------------------------------------------------------------ */
  /* 🏗️ FACTORY                                                                */
  /* ------------------------------------------------------------------------ */

  static create(params: {
    id: string;
    coordinates: GeoCoordinates;
    datum?: GeoDatum;
    source?: string;
    timestamp?: EpochMillis;
    accuracyScore?: number;
  }): GeoPointEntity {
    const { latitude, longitude } = params.coordinates;

    if (
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw new GeoPointError(
        "Invalid latitude or longitude"
      );
    }

    const normalized: GeoCoordinates = {
      ...params.coordinates,
      latitude: clamp(latitude, -90, 90),
      longitude: clamp(longitude, -180, 180),
    };

    const snapshot: GeoPointSnapshot = {
      id: params.id,
      coordinates: normalized,
      datum: params.datum ?? "WGS84",
      timestamp: params.timestamp ?? now(),
      source: params.source,
      accuracyScore: clamp(
        params.accuracyScore ?? 1,
        0,
        1
      ),
    };

    return new GeoPointEntity(snapshot);
  }

  /* ------------------------------------------------------------------------ */
  /* 📏 DISTANCE TO                                                            */
  /* ------------------------------------------------------------------------ */

  distanceTo(
    other: GeoPointEntity
  ): Meters {
    const a = this.snapshot.coordinates;
    const b = other.snapshot.coordinates;

    const lat1 = toRadians(a.latitude);
    const lat2 = toRadians(b.latitude);
    const dLat = lat2 - lat1;
    const dLon = toRadians(
      b.longitude - a.longitude
    );

    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(dLon / 2) ** 2;

    const c =
      2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

    return EARTH_RADIUS_METERS * c;
  }

  /* ------------------------------------------------------------------------ */
  /* ♻️ HYDRATE                                                                */
  /* ------------------------------------------------------------------------ */

  static hydrate(
    snapshot: GeoPointSnapshot
  ): GeoPointEntity {
    if (!snapshot?.id) {
      throw new GeoPointError(
        "Invalid GeoPoint snapshot"
      );
    }
    return new GeoPointEntity(snapshot);
  }
}
