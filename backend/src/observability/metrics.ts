/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE OBSERVABILITY — METRICS ENGINE (WORLD #1 FINAL)             */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/observability/metrics.ts                               */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Responsibilities:                                                        */
/*   - Collect runtime metrics                                                */
/*   - Provide counters, gauges and timers                                    */
/*   - Export snapshots for monitoring                                        */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { logger } from "./logger";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type MetricType = "counter" | "gauge" | "timer";

interface BaseMetric {
  name: string;
  type: MetricType;
  description?: string;
}

interface CounterMetric extends BaseMetric {
  type: "counter";
  value: number;
}

interface GaugeMetric extends BaseMetric {
  type: "gauge";
  value: number;
}

interface TimerMetric extends BaseMetric {
  type: "timer";
  samples: number[];
}

/* -------------------------------------------------------------------------- */
/* INTERNAL STORE                                                             */
/* -------------------------------------------------------------------------- */

const counters = new Map<string, CounterMetric>();
const gauges = new Map<string, GaugeMetric>();
const timers = new Map<string, TimerMetric>();

/* -------------------------------------------------------------------------- */
/* UTILITIES                                                                  */
/* -------------------------------------------------------------------------- */

const percentile = (
  values: number[],
  p: number
): number => {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil(
    (p / 100) * sorted.length
  ) - 1;

  return sorted[Math.max(0, idx)];
};

/* -------------------------------------------------------------------------- */
/* COUNTERS                                                                   */
/* -------------------------------------------------------------------------- */

export const incrementCounter = (
  name: string,
  delta = 1,
  description?: string
) => {
  const counter =
    counters.get(name) ??
    ({
      name,
      type: "counter",
      value: 0,
      description,
    } as CounterMetric);

  counter.value += delta;
  counters.set(name, counter);
};

/* -------------------------------------------------------------------------- */
/* GAUGES                                                                     */
/* -------------------------------------------------------------------------- */

export const setGauge = (
  name: string,
  value: number,
  description?: string
) => {
  gauges.set(name, {
    name,
    type: "gauge",
    value,
    description,
  });
};

/* -------------------------------------------------------------------------- */
/* TIMERS                                                                     */
/* -------------------------------------------------------------------------- */

export const recordTimer = (
  name: string,
  durationMs: number,
  description?: string
) => {
  const timer =
    timers.get(name) ??
    ({
      name,
      type: "timer",
      samples: [],
      description,
    } as TimerMetric);

  timer.samples.push(durationMs);

  if (timer.samples.length > 10_000) {
    timer.samples.shift();
  }

  timers.set(name, timer);
};

/* -------------------------------------------------------------------------- */
/* SNAPSHOT                                                                   */
/* -------------------------------------------------------------------------- */

export const snapshotMetrics = () => {
  const snapshot = {
    counters: Array.from(counters.values()),
    gauges: Array.from(gauges.values()),
    timers: Array.from(timers.values()).map(
      (t) => ({
        name: t.name,
        count: t.samples.length,
        p50: percentile(t.samples, 50),
        p95: percentile(t.samples, 95),
        p99: percentile(t.samples, 99),
      })
    ),
    collectedAt: new Date().toISOString(),
  };

  logger.debug("📊 Metrics snapshot", snapshot);

  return snapshot;
};
