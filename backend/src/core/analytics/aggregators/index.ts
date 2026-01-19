/* -------------------------------------------------------------------------- */
/*  CORE / ANALYTICS — AGGREGATORS EXPORT HUB                                  */
/*  File: core/analytics/aggregators/index.ts                                 */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  📦 Centralized exports for analytics aggregators                           */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* 📈 TIME SERIES                                                              */
/* -------------------------------------------------------------------------- */

export {
  TimeSeriesAggregator,
  TimeSeriesAggregatorError,
} from "./timeseries.aggregator";

/* -------------------------------------------------------------------------- */
/* 👥 COHORT                                                                   */
/* -------------------------------------------------------------------------- */

export {
  CohortAggregator,
  CohortAggregatorError,
} from "./cohort.aggregator";

/* -------------------------------------------------------------------------- */
/* ⚡ REALTIME                                                                 */
/* -------------------------------------------------------------------------- */

export {
  RealtimeAggregator,
  RealtimeAggregatorError,
} from "./realtime.aggregator";

/* -------------------------------------------------------------------------- */
/* 🔮 FUTURE EXTENSIONS                                                        */
/* -------------------------------------------------------------------------- */
/*
export { GraphAggregator } from "./graph.aggregator";
export { AnomalyAggregator } from "./anomaly.aggregator";
export { ForecastAggregator } from "./forecast.aggregator";
*/
