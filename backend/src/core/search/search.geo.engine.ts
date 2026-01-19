/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE SEARCH — GEO INTELLIGENCE ENGINE (WORLD #1)                     */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/search/search.geo.engine.ts                         */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Recherche par proximité                                                */
/*   - Calculs géodésiques offline                                             */
/*   - Clustering intelligent                                                 */
/*   - Heatmaps dynamiques                                                    */
/*   - Scoring géospatial                                                     */
/*   - Prédiction d’activité locale                                           */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import crypto from "crypto";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type GeoPoint = {
  lat: number;
  lng: number;
};

export type GeoEntity = {
  id: string;
  location: GeoPoint;
  weight?: number;
  tags?: string[];
  lastActiveAt?: Date;
};

export type GeoCluster = {
  id: string;
  center: GeoPoint;
  count: number;
  entities: GeoEntity[];
};

export type HeatPoint = {
  location: GeoPoint;
  intensity: number;
};

/* -------------------------------------------------------------------------- */
/* CONSTANTS                                                                  */
/* -------------------------------------------------------------------------- */

const EARTH_RADIUS_KM = 6371;
const DEFAULT_CLUSTER_RADIUS_KM = 0.7;

/* -------------------------------------------------------------------------- */
/* UTILS                                                                      */
/* -------------------------------------------------------------------------- */

const degToRad = (deg: number) =>
  (deg * Math.PI) / 180;

/**
 * Distance Haversine réelle (offline).
 */
export const haversineKm = (
  a: GeoPoint,
  b: GeoPoint
): number => {
  const dLat = degToRad(b.lat - a.lat);
  const dLng = degToRad(b.lng - a.lng);

  const sa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(degToRad(a.lat)) *
      Math.cos(degToRad(b.lat)) *
      Math.sin(dLng / 2) ** 2;

  return (
    2 *
    EARTH_RADIUS_KM *
    Math.asin(Math.sqrt(sa))
  );
};

/* -------------------------------------------------------------------------- */
/* GEO ENGINE                                                                 */
/* -------------------------------------------------------------------------- */

export class SearchGeoEngine {
  /* ======================================================================== */
  /* PROXIMITY SEARCH                                                         */
  /* ======================================================================== */

  searchNearby(params: {
    center: GeoPoint;
    entities: GeoEntity[];
    radiusKm: number;
  }): GeoEntity[] {
    return params.entities.filter((entity) => {
      const distance = haversineKm(
        params.center,
        entity.location
      );
      return distance <= params.radiusKm;
    });
  }

  /* ======================================================================== */
  /* CLUSTERING                                                               */
  /* ======================================================================== */

  clusterize(params: {
    entities: GeoEntity[];
    radiusKm?: number;
  }): GeoCluster[] {
    const radius =
      params.radiusKm ?? DEFAULT_CLUSTER_RADIUS_KM;

    const clusters: GeoCluster[] = [];
    const visited = new Set<string>();

    for (const entity of params.entities) {
      if (visited.has(entity.id)) continue;

      const clusterEntities: GeoEntity[] = [entity];
      visited.add(entity.id);

      for (const other of params.entities) {
        if (visited.has(other.id)) continue;

        const dist = haversineKm(
          entity.location,
          other.location
        );

        if (dist <= radius) {
          clusterEntities.push(other);
          visited.add(other.id);
        }
      }

      const center = this.computeCenter(
        clusterEntities
      );

      clusters.push({
        id: crypto.randomUUID(),
        center,
        count: clusterEntities.length,
        entities: clusterEntities,
      });
    }

    return clusters;
  }

  /* ======================================================================== */
  /* HEATMAP                                                                  */
  /* ======================================================================== */

  buildHeatmap(
    entities: GeoEntity[]
  ): HeatPoint[] {
    return entities.map((e) => ({
      location: e.location,
      intensity:
        (e.weight ?? 1) *
        this.activityBoost(e.lastActiveAt),
    }));
  }

  /* ======================================================================== */
  /* PREDICTIVE ZONES                                                         */
  /* ======================================================================== */

  predictHotZones(
    heatmap: HeatPoint[],
    threshold = 2
  ): HeatPoint[] {
    return heatmap.filter(
      (h) => h.intensity >= threshold
    );
  }

  /* ======================================================================== */
  /* HELPERS                                                                  */
  /* ======================================================================== */

  private computeCenter(
    entities: GeoEntity[]
  ): GeoPoint {
    const sum = entities.reduce(
      (acc, e) => {
        acc.lat += e.location.lat;
        acc.lng += e.location.lng;
        return acc;
      },
      { lat: 0, lng: 0 }
    );

    return {
      lat: sum.lat / entities.length,
      lng: sum.lng / entities.length,
    };
  }

  private activityBoost(
    lastActiveAt?: Date
  ): number {
    if (!lastActiveAt) return 1;

    const hours =
      (Date.now() - lastActiveAt.getTime()) /
      1000 /
      3600;

    if (hours < 1) return 3;
    if (hours < 6) return 2;
    if (hours < 24) return 1.5;
    return 1;
  }
}

/* -------------------------------------------------------------------------- */
/* SINGLETON                                                                  */
/* -------------------------------------------------------------------------- */

export const searchGeoEngine =
  new SearchGeoEngine();
