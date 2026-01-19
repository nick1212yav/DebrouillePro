/* -------------------------------------------------------------------------- */
/*  CORE / GEO — GEOFENCE SERVICE                                              */
/*  File: core/geo/geo.geofence.service.ts                                    */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  🚧 Entry • Exit • Multi-Zone • Offline • Observable                         */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  GeoFenceDefinition,
  GeoPointSnapshot,
  Meters,
} from "./geo.types";

import { GeoPointEntity } from "./geo.point.model";

/* -------------------------------------------------------------------------- */
/* 🧱 ERREURS                                                                  */
/* -------------------------------------------------------------------------- */

export class GeoFenceError extends Error {
  constructor(message: string) {
    super(`[GeoFence] ${message}`);
  }
}

/* -------------------------------------------------------------------------- */
/* 📦 INTERNAL TYPES                                                           */
/* -------------------------------------------------------------------------- */

interface GeoFenceState {
  inside: boolean;
  lastDistance?: Meters;
}

/* -------------------------------------------------------------------------- */
/* 🚧 GEOFENCE SERVICE                                                         */
/* -------------------------------------------------------------------------- */

export class GeoFenceService {
  private readonly fences = new Map<
    string,
    GeoFenceDefinition
  >();

  private readonly states = new Map<
    string,
    GeoFenceState
  >();

  /* ------------------------------------------------------------------------ */
  /* ➕ REGISTER FENCE                                                         */
  /* ------------------------------------------------------------------------ */

  registerFence(def: GeoFenceDefinition) {
    if (!def.id) {
      throw new GeoFenceError("Fence id required");
    }
    this.fences.set(def.id, {
      ...def,
      active: def.active ?? true,
    });
  }

  removeFence(id: string) {
    this.fences.delete(id);
    this.states.delete(id);
  }

  /* ------------------------------------------------------------------------ */
  /* 📍 EVALUATE POSITION                                                      */
  /* ------------------------------------------------------------------------ */

  evaluatePosition(
    position: GeoPointSnapshot
  ) {
    const point =
      GeoPointEntity.hydrate(position);

    const events: Array<{
      fenceId: string;
      type: "enter" | "exit" | "inside" | "outside";
      distance: Meters;
    }> = [];

    for (const fence of this.fences.values()) {
      if (!fence.active) continue;

      const center =
        GeoPointEntity.create({
          id: `fence:${fence.id}`,
          coordinates: fence.center,
        });

      const distance =
        point.distanceTo(center);

      const inside =
        distance <= fence.radiusMeters;

      const prev =
        this.states.get(fence.id) ?? {
          inside: false,
        };

      let type:
        | "enter"
        | "exit"
        | "inside"
        | "outside" = "outside";

      if (inside && !prev.inside) type = "enter";
      else if (!inside && prev.inside) type = "exit";
      else if (inside) type = "inside";

      this.states.set(fence.id, {
        inside,
        lastDistance: distance,
      });

      events.push({
        fenceId: fence.id,
        type,
        distance,
      });
    }

    return events;
  }

  /* ------------------------------------------------------------------------ */
  /* ♻️ RESET                                                                  */
  /* ------------------------------------------------------------------------ */

  reset() {
    this.states.clear();
  }
}
