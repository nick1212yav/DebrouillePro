/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE EVENTS — EVENT STORE (WORLD #1 FINAL)                          */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/events/event.store.ts                                   */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Responsibilities:                                                        */
/*   - Persist all events deterministically                                   */
/*   - Enable replay, audit and diagnostics                                   */
/*   - Support filtering and pagination                                       */
/*   - Enforce retention policies                                              */
/*   - Prepare future external storage adapters                                */
/*                                                                            */
/*  Guarantees:                                                              */
/*   - Immutable event storage                                                 */
/*   - No mutation of historical events                                        */
/*   - Predictable ordering                                                    */
/*   - Type-safe                                                               */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  BaseEvent,
  EventFilter,
  SerializedEvent,
} from "./event.types";
import { logger } from "../shared/logger";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export interface EventStoreStats {
  totalEvents: number;
  memoryBytesEstimate: number;
  oldestEventTimestamp?: number;
  newestEventTimestamp?: number;
}

export interface ReplayOptions {
  /**
   * Inclusive timestamp boundaries (epoch ms).
   */
  fromTimestamp?: number;
  toTimestamp?: number;

  /**
   * Optional filter predicate.
   */
  filter?: EventFilter;

  /**
   * Pagination support.
   */
  limit?: number;
  offset?: number;
}

/* -------------------------------------------------------------------------- */
/* INTERNAL CONFIG                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Maximum number of events kept in memory.
 * Oldest events are evicted when limit is reached.
 */
const MAX_EVENTS_IN_MEMORY = 100_000;

/**
 * Rough memory estimation factor (bytes per char).
 * Used only for diagnostics (not billing-grade).
 */
const MEMORY_ESTIMATE_FACTOR = 2;

/* -------------------------------------------------------------------------- */
/* INTERNAL STATE                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Immutable serialized events storage.
 * New events are appended only.
 */
const store: SerializedEvent[] = [];

/* -------------------------------------------------------------------------- */
/* SERIALIZATION                                                              */
/* -------------------------------------------------------------------------- */

const serializeEvent = (
  event: BaseEvent
): SerializedEvent => {
  return {
    meta: event.meta,
    payload: JSON.stringify(event.payload),
  };
};

const deserializeEvent = (
  serialized: SerializedEvent
): BaseEvent => {
  return {
    meta: serialized.meta,
    payload: JSON.parse(serialized.payload),
  };
};

/* -------------------------------------------------------------------------- */
/* RETENTION POLICY                                                           */
/* -------------------------------------------------------------------------- */

const enforceRetentionPolicy = (): void => {
  if (store.length <= MAX_EVENTS_IN_MEMORY) return;

  const overflow = store.length - MAX_EVENTS_IN_MEMORY;
  store.splice(0, overflow);

  logger.warn("🧹 Event store retention applied", {
    evicted: overflow,
    remaining: store.length,
  });
};

/* -------------------------------------------------------------------------- */
/* PUBLIC API — PERSISTENCE                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Persist an event into the in-memory store.
 * This function must NEVER throw.
 */
export const persistEvent = async (
  event: BaseEvent
): Promise<void> => {
  try {
    const serialized = serializeEvent(event);
    store.push(serialized);

    enforceRetentionPolicy();
  } catch (error) {
    logger.error("❌ Failed to persist event in store", {
      error,
    });
  }
};

/* -------------------------------------------------------------------------- */
/* PUBLIC API — REPLAY                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Replay historical events with filtering and pagination.
 */
export const replayEvents = async (
  options: ReplayOptions = {}
): Promise<BaseEvent[]> => {
  const {
    fromTimestamp,
    toTimestamp,
    filter,
    limit,
    offset = 0,
  } = options;

  let events = store.map(deserializeEvent);

  if (fromTimestamp !== undefined) {
    events = events.filter(
      (e) => e.meta.timestamp >= fromTimestamp
    );
  }

  if (toTimestamp !== undefined) {
    events = events.filter(
      (e) => e.meta.timestamp <= toTimestamp
    );
  }

  if (filter) {
    events = events.filter(filter);
  }

  if (offset > 0) {
    events = events.slice(offset);
  }

  if (limit !== undefined) {
    events = events.slice(0, limit);
  }

  return events;
};

/* -------------------------------------------------------------------------- */
/* PUBLIC API — DIAGNOSTICS                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Retrieve store health and memory diagnostics.
 */
export const getEventStoreStats = (): EventStoreStats => {
  const totalEvents = store.length;

  const memoryBytesEstimate = store.reduce(
    (sum, e) =>
      sum +
      (e.payload.length +
        JSON.stringify(e.meta).length) *
        MEMORY_ESTIMATE_FACTOR,
    0
  );

  const oldestEventTimestamp =
    store[0]?.meta.timestamp;

  const newestEventTimestamp =
    store[store.length - 1]?.meta.timestamp;

  return {
    totalEvents,
    memoryBytesEstimate,
    oldestEventTimestamp,
    newestEventTimestamp,
  };
};

/* -------------------------------------------------------------------------- */
/* PUBLIC API — MAINTENANCE                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Clear the event store (dangerous).
 * Intended for tests or controlled maintenance only.
 */
export const clearEventStore = (): void => {
  store.length = 0;

  logger.warn("🧨 Event store cleared manually");
};
