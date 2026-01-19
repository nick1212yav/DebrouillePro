/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE TESTS — METRICS UNIT TESTS (WORLD #1 FINAL)                */
/* -------------------------------------------------------------------------- */

import {
  incrementCounter,
  setGauge,
  recordTimer,
  snapshotMetrics,
} from "@/observability";

describe("Observability / Metrics", () => {
  it("should increment counters correctly", () => {
    incrementCounter("api.requests");
    incrementCounter("api.requests", 2);

    const snapshot = snapshotMetrics();
    const counter = snapshot.counters.find(
      (c) => c.name === "api.requests"
    );

    expect(counter?.value).toBe(3);
  });

  it("should record gauge values", () => {
    setGauge("memory.usage", 512);

    const snapshot = snapshotMetrics();
    const gauge = snapshot.gauges.find(
      (g) => g.name === "memory.usage"
    );

    expect(gauge?.value).toBe(512);
  });

  it("should record timer samples", () => {
    recordTimer("db.query", 120);
    recordTimer("db.query", 80);
    recordTimer("db.query", 200);

    const snapshot = snapshotMetrics();
    const timer = snapshot.timers.find(
      (t) => t.name === "db.query"
    );

    expect(timer?.count).toBeGreaterThanOrEqual(3);
    expect(timer?.p95).toBeGreaterThan(0);
  });
});
