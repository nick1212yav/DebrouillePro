/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE SEARCH — ANALYTICS INTELLIGENCE ENGINE (WORLD #1)               */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/search/search.analytics.engine.ts                   */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  🧠 RÔLE :                                                                 */
/*   - Observer toutes les requêtes                                           */
/*   - Construire des métriques temps réel                                    */
/*   - Détecter tendances & anomalies                                         */
/*   - Piloter le cache & le ranking                                          */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { EventEmitter } from "events";
import crypto from "crypto";

import {
  SearchQuery,
  SearchResult,
  SearchSource,
} from "./search.types";

import {
  searchCacheAdapter,
} from "./search.cache.adapter";

/* -------------------------------------------------------------------------- */
/* METRICS TYPES                                                              */
/* -------------------------------------------------------------------------- */

type QueryMetric = {
  queryHash: string;
  text: string;
  count: number;
  lastSeenAt: number;
  avgLatencyMs: number;
};

type Trend = {
  query: string;
  growth: number;
  velocity: number;
};

/* -------------------------------------------------------------------------- */
/* INTERNAL STORES                                                            */
/* -------------------------------------------------------------------------- */

const queryStore = new Map<string, QueryMetric>();
const latencyWindow: number[] = [];

const MAX_WINDOW = 500;

/* -------------------------------------------------------------------------- */
/* ANALYTICS ENGINE                                                           */
/* -------------------------------------------------------------------------- */

export class SearchAnalyticsEngine {
  private readonly emitter = new EventEmitter();

  /* ======================================================================== */
  /* OBSERVE                                                                  */
  /* ======================================================================== */

  observe(params: {
    query: SearchQuery;
    results: SearchResult[];
    source: SearchSource;
    latencyMs: number;
  }) {
    this.trackQuery(params.query, params.latencyMs);
    this.trackLatency(params.latencyMs);
    this.detectWarmupCandidates();
  }

  /* ======================================================================== */
  /* QUERY TRACKING                                                           */
  /* ======================================================================== */

  private trackQuery(
    query: SearchQuery,
    latency: number
  ) {
    const hash = crypto
      .createHash("sha1")
      .update(query.text)
      .digest("hex");

    const now = Date.now();

    const metric =
      queryStore.get(hash) ?? {
        queryHash: hash,
        text: query.text,
        count: 0,
        lastSeenAt: now,
        avgLatencyMs: latency,
      };

    metric.count += 1;
    metric.lastSeenAt = now;
    metric.avgLatencyMs =
      metric.avgLatencyMs * 0.9 + latency * 0.1;

    queryStore.set(hash, metric);
  }

  /* ======================================================================== */
  /* LATENCY TRACKING                                                         */
  /* ======================================================================== */

  private trackLatency(latency: number) {
    latencyWindow.push(latency);
    if (latencyWindow.length > MAX_WINDOW) {
      latencyWindow.shift();
    }
  }

  /* ======================================================================== */
  /* TREND DETECTION                                                          */
  /* ======================================================================== */

  getTrendingQueries(): Trend[] {
    const metrics = [...queryStore.values()];

    return metrics
      .filter((m) => m.count > 5)
      .map((m) => ({
        query: m.text,
        growth: m.count,
        velocity:
          Date.now() - m.lastSeenAt < 60_000
            ? 1
            : 0.3,
      }))
      .sort((a, b) => b.growth - a.growth)
      .slice(0, 10);
  }

  /* ======================================================================== */
  /* CACHE WARMUP                                                             */
  /* ======================================================================== */

  private detectWarmupCandidates() {
    const trends = this.getTrendingQueries();

    for (const trend of trends) {
      this.emitter.emit("warmup", trend.query);
    }
  }

  onWarmup(
    handler: (query: string) => void
  ) {
    this.emitter.on("warmup", handler);
  }

  /* ======================================================================== */
  /* HEALTH METRICS                                                           */
  /* ======================================================================== */

  getHealth() {
    const avgLatency =
      latencyWindow.reduce((a, b) => a + b, 0) /
      (latencyWindow.length || 1);

    return {
      avgLatencyMs: Math.round(avgLatency),
      trackedQueries: queryStore.size,
      hotTrends: this.getTrendingQueries(),
    };
  }
}

/* -------------------------------------------------------------------------- */
/* SINGLETON                                                                  */
/* -------------------------------------------------------------------------- */

export const searchAnalyticsEngine =
  new SearchAnalyticsEngine();

/* -------------------------------------------------------------------------- */
/* AUTO CACHE WARMUP BINDING                                                   */
/* -------------------------------------------------------------------------- */

searchAnalyticsEngine.onWarmup(async (query) => {
  try {
    console.log("🔥 Cache warmup for:", query);

    // Placeholder futur: relancer moteur de recherche complet
    searchCacheAdapter.invalidate(query);
  } catch (err) {
    console.warn("Warmup failed:", err);
  }
});
