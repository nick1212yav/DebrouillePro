/* -------------------------------------------------------------------------- */
/*  CORE / ANALYTICS — TIME SERIES AGGREGATOR                                  */
/*  File: core/analytics/aggregators/timeseries.aggregator.ts                 */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  📈 Windowed Aggregation • Streaming • Memory Bounded                       */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  AnalyticsAggregation,
  AnalyticsDataPoint,
  EpochMillis,
} from "../analytics.types";

/* -------------------------------------------------------------------------- */
/* 🧱 ERREURS                                                                  */
/* -------------------------------------------------------------------------- */

export class TimeSeriesAggregatorError extends Error {
  constructor(message: string) {
    super(`[TimeSeriesAggregator] ${message}`);
  }
}

/* -------------------------------------------------------------------------- */
/* 📦 INTERNAL WINDOW                                                         */
/* -------------------------------------------------------------------------- */

interface WindowBucket {
  start: EpochMillis;
  end: EpochMillis;
  values: number[];
}

/* -------------------------------------------------------------------------- */
/* 📈 AGGREGATOR                                                               */
/* -------------------------------------------------------------------------- */

export class TimeSeriesAggregator {
  private readonly buckets: WindowBucket[] = [];

  constructor(
    private readonly windowSizeMs: number,
    private readonly aggregation: AnalyticsAggregation,
    private readonly maxBuckets: number = 1_000
  ) {
    if (windowSizeMs <= 0) {
      throw new TimeSeriesAggregatorError(
        "windowSizeMs must be > 0"
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* ➕ INGEST                                                                 */
  /* ------------------------------------------------------------------------ */

  ingest(value: number, timestamp: EpochMillis = Date.now()) {
    let bucket = this.buckets.find(
      (b) => timestamp >= b.start && timestamp < b.end
    );

    if (!bucket) {
      bucket = this.createBucket(timestamp);
      this.buckets.push(bucket);
      this.trimBuckets();
    }

    bucket.values.push(value);
  }

  /* ------------------------------------------------------------------------ */
  /* 📊 SNAPSHOT                                                               */
  /* ------------------------------------------------------------------------ */

  snapshot(): AnalyticsDataPoint[] {
    return this.buckets.map((bucket) => ({
      timestamp: bucket.start,
      value: this.aggregate(bucket.values),
    }));
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

  private createBucket(
    timestamp: EpochMillis
  ): WindowBucket {
    const start =
      Math.floor(timestamp / this.windowSizeMs) *
      this.windowSizeMs;

    return {
      start,
      end: start + this.windowSizeMs,
      values: [],
    };
  }

  private trimBuckets() {
    if (this.buckets.length > this.maxBuckets) {
      this.buckets.splice(
        0,
        this.buckets.length - this.maxBuckets
      );
    }
  }

  private aggregate(values: number[]): number {
    if (values.length === 0) return 0;

    switch (this.aggregation) {
      case "count":
        return values.length;

      case "sum":
        return values.reduce((a, b) => a + b, 0);

      case "avg":
        return (
          values.reduce((a, b) => a + b, 0) /
          values.length
        );

      case "min":
        return Math.min(...values);

      case "max":
        return Math.max(...values);

      default:
        throw new TimeSeriesAggregatorError(
          `Unsupported aggregation: ${this.aggregation}`
        );
    }
  }
}
