/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE DATABASE — CONNECT FACADE (WORLD #1 FINAL)                     */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/database/connect.ts                                     */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Strategic role:                                                          */
/*   - Provide a stable public API for database connectivity                  */
/*   - Prevent direct coupling with low-level mongoose engine                 */
/*   - Enforce single connection governance                                   */
/*   - Preserve backward compatibility and future extensibility              */
/*                                                                            */
/*  Guarantees:                                                              */
/*   - No duplicated connections                                              */
/*   - No process signal side-effects                                          */
/*   - Type-safe re-exports                                                    */
/*   - Deterministic behavior                                                  */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* ENGINE                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * All real connection logic lives in mongoose.ts.
 * This file is only a controlled facade.
 */

import {
  initDatabase,
  shutdownDatabase,
  getDatabaseInfo,
  type DatabaseInfo,
  type DatabaseStatus,
} from "./mongoose";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Public alias — allows future engine swap (Mongo → Postgres, etc.)
 * without touching application imports.
 */
export type {
  DatabaseInfo,
  DatabaseStatus,
};

/* -------------------------------------------------------------------------- */
/* PUBLIC API                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Establish database connection.
 * Idempotent and concurrency-safe.
 */
export const connectDatabase = async (): Promise<void> => {
  return initDatabase();
};

/**
 * Gracefully close database connection.
 * Safe to call multiple times.
 */
export const disconnectDatabase = async (): Promise<void> => {
  return shutdownDatabase();
};

/**
 * Retrieve live database diagnostics and health metadata.
 */
export const getDatabaseHealth = (): DatabaseInfo => {
  return getDatabaseInfo();
};

/* -------------------------------------------------------------------------- */
/* GOVERNANCE                                                                 */
/* -------------------------------------------------------------------------- */
/*
  Usage rules across the codebase:

  ✅ Always import database connectivity from:
        import { connectDatabase, disconnectDatabase } from "@/database/connect";

  ❌ Never import directly from:
        "@/database/mongoose"

  Why:
   - Allows future engine replacement
   - Keeps infrastructure encapsulated
   - Prevents accidental misuse of low-level APIs
   - Enforces architectural boundaries
*/
