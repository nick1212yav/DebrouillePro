/* -------------------------------------------------------------------------- */
/*  CORE / ANALYTICS — REALTIME AGGREGATOR                                     */
/*  File: core/analytics/aggregators/realtime.aggregator.ts                   */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  ⚡ Sliding Counters • Throughput • Alert Ready                              */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { EpochMillis } from "../analytics.types";

/* -------------------------------------------------------------------------- */
/* 🧱 ERREURS                                                                  */
/* -------------------------------------------------------------------------- */

export class RealtimeAggregatorError extends Error {
  constructor(message: string) {
    super(`[RealtimeAggregator] ${message}`);
  }
}

/* -------------------------------------------------------------------------- */
/* 📦 INTERNAL WINDOW                                                         */
/* -------------------------------------------------------------------------- */

interface CounterBucket {
  timestamp: EpochMillis;
  count: number;
}

/* -------------------------------------------------------------------------- */
/* ⚡ AGGREGATOR                                                               */
/* -------------------------------------------------------------------------- */

export class RealtimeAggregator {
  private readonly buckets: CounterBucket[] = [];

  constructor(
    private readonly windowMs: number = 10_000,
    private readonly resolutionMs: number = 1_000
  ) {
    if (windowMs <= 0 || resolutionMs <= 0) {
      throw new RealtimeAggregatorError(
        "windowMs and resolutionMs must be > 0"
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* ➕ INGEST                                                                 */
  /* ------------------------------------------------------------------------ */

  increment(
    timestamp: EpochMillis = Date.now()
  ) {
    const bucketTime =
      Math.floor(timestamp / this.resolutionMs) *
      this.resolutionMs;

    let bucket = this.buckets.find(
      (b) => b.timestamp === bucketTime
    );

    if (!bucket) {
      bucket = { timestamp: bucketTime, count: 0 };
      this.buckets.push(bucket);
    }

    bucket.count++;
    this.trim();
  }

  /* ------------------------------------------------------------------------ */
  /* 📊 SNAPSHOT                                                               */
  /* ------------------------------------------------------------------------ */

  snapshot() {
    const now = Date.now();
    const active = this.buckets.filter(
      (b) => now - b.timestamp <= this.windowMs
    );

    const total = active.reduce(
      (sum, b) => sum + b.count,
      0
    );

    const ratePerSecond =
      total / (this.windowMs / 1_000);

    return {
      totalEvents: total,
      ratePerSecond,
      buckets: [...active],
    };
  }

  /* ------------------------------------------------------------------------ */
  /* ♻️ RESET                                                                  */
  /* ------------------------------------------------------------------------ */

  reset() {
    this.buckets.length = 0;
  }

  /* ------------------------------------------------------------------------ */
  /* 🧠 INTERNALS                                                              */
  /* ------------------------------------------------------------------------ */

  private trim() {
    const now = Date.now();
    const cutoff = now - this.windowMs;

    while (
      this.buckets.length > 0 &&
      this.buckets[0].timestamp < cutoff
    ) {
      this.buckets.shift();
    }
  }
}
