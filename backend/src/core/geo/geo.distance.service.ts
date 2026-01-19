/* -------------------------------------------------------------------------- */
/*  CORE / GEO — DISTANCE SERVICE                                              */
/*  File: core/geo/geo.distance.service.ts                                    */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  📏 Spatial Math Engine • Batch • Nearest • Planet Scale                     */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  GeoCoordinates,
  GeoDistanceResult,
  GeoBoundingBox,
  Degrees,
  Meters,
} from "./geo.types";

import { GeoPointEntity } from "./geo.point.model";

/* -------------------------------------------------------------------------- */
/* 🧱 ERREURS                                                                  */
/* -------------------------------------------------------------------------- */

export class GeoDistanceError extends Error {
  constructor(message: string) {
    super(`[GeoDistance] ${message}`);
  }
}

/* -------------------------------------------------------------------------- */
/* 🌐 CONSTANTS                                                                */
/* -------------------------------------------------------------------------- */

const EARTH_RADIUS_METERS = 6_371_000;

/* -------------------------------------------------------------------------- */
/* 🧠 UTILITIES                                                                */
/* -------------------------------------------------------------------------- */

function toRadians(deg: Degrees): number {
  return (deg * Math.PI) / 180;
}

function toDegrees(rad: number): Degrees {
  return (rad * 180) / Math.PI;
}

/* -------------------------------------------------------------------------- */
/* 📏 DISTANCE SERVICE                                                         */
/* -------------------------------------------------------------------------- */

export class GeoDistanceService {
  /* ------------------------------------------------------------------------ */
  /* 📍 POINT TO POINT                                                         */
  /* ------------------------------------------------------------------------ */

  static distanceBetween(
    a: GeoCoordinates,
    b: GeoCoordinates
  ): GeoDistanceResult {
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

    const meters = EARTH_RADIUS_METERS * c;

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) *
        Math.cos(lat2) *
        Math.cos(dLon);

    const bearing =
      (toDegrees(Math.atan2(y, x)) + 360) % 360;

    return {
      meters,
      kilometers: meters / 1_000,
      bearingDegrees: bearing,
    };
  }

  /* ------------------------------------------------------------------------ */
  /* 📦 BATCH DISTANCE                                                         */
  /* ------------------------------------------------------------------------ */

  static batchDistance(
    origin: GeoPointEntity,
    targets: GeoPointEntity[]
  ) {
    return targets.map((target) => ({
      target,
      distance: origin.distanceTo(target),
    }));
  }

  /* ------------------------------------------------------------------------ */
  /* 🎯 NEAREST POINT                                                          */
  /* ------------------------------------------------------------------------ */

  static nearest(
    origin: GeoPointEntity,
    targets: GeoPointEntity[]
  ) {
    if (targets.length === 0) return null;

    let best = targets[0];
    let bestDistance =
      origin.distanceTo(targets[0]);

    for (let i = 1; i < targets.length; i++) {
      const d = origin.distanceTo(targets[i]);
      if (d < bestDistance) {
        best = targets[i];
        bestDistance = d;
      }
    }

    return {
      point: best,
      distanceMeters: bestDistance,
    };
  }

  /* ------------------------------------------------------------------------ */
  /* 🗺️ BOUNDING BOX AROUND POINT                                              */
  /* ------------------------------------------------------------------------ */

  static boundingBox(
    center: GeoCoordinates,
    radiusMeters: Meters
  ): GeoBoundingBox {
    const lat = toRadians(center.latitude);
    const lon = toRadians(center.longitude);

    const angularDistance =
      radiusMeters / EARTH_RADIUS_METERS;

    const minLat = lat - angularDistance;
    const maxLat = lat + angularDistance;

    const deltaLon = Math.asin(
      Math.sin(angularDistance) / Math.cos(lat)
    );

    const minLon = lon - deltaLon;
    const maxLon = lon + deltaLon;

    return {
      north: toDegrees(maxLat),
      south: toDegrees(minLat),
      east: toDegrees(maxLon),
      west: toDegrees(minLon),
    };
  }
}
