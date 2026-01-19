/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE DATABASE — PUBLIC EXPORT HUB (WORLD #1 FINAL — LOCKED)         */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/database/index.ts                                       */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Strategic role:                                                          */
/*   - Single public entrypoint for database access                            */
/*   - Enforce architectural boundaries                                       */
/*   - Prevent deep imports                                                    */
/*   - Stabilize long-term contracts                                           */
/*                                                                            */
/*  Guarantees:                                                              */
/*   - No circular dependencies                                               */
/*   - Explicit exports only                                                  */
/*   - Type-safe contracts                                                    */
/*   - Engine encapsulation                                                   */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  connectDatabase,
  disconnectDatabase,
  getDatabaseHealth,
  type DatabaseInfo,
  type DatabaseStatus,
} from "./connect";

/* -------------------------------------------------------------------------- */
/* PUBLIC FACADE — COMPATIBILITY LAYER                                        */
/* -------------------------------------------------------------------------- */
/**
 * ⚠️ IMPORTANT
 * These aliases guarantee backward compatibility with the global bootstrap
 * (server.ts) and prevent cascading refactors across the codebase.
 *
 * DO NOT rename without updating the bootstrap contract.
 */

/**
 * Initialize database infrastructure.
 */
export const initDatabase = async (): Promise<void> => {
  await connectDatabase();
};

/**
 * Gracefully shutdown database infrastructure.
 */
export const shutdownDatabase = async (): Promise<void> => {
  await disconnectDatabase();
};

/**
 * Returns current database runtime information.
 */
export const getDatabaseInfo = (): DatabaseInfo => {
  return getDatabaseHealth();
};

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type { DatabaseInfo, DatabaseStatus };

/* -------------------------------------------------------------------------- */
/* GOVERNANCE                                                                 */
/* -------------------------------------------------------------------------- */
/*
  Usage rules across the codebase:

  ✅ Always import database APIs from:
        import { initDatabase, getDatabaseInfo } from "@/database";

  ❌ Never import directly from:
        "@/database/mongoose"
        "@/database/connect"

  This guarantees:
   - Infrastructure encapsulation
   - Future engine portability
   - Clean dependency graph
   - Stable refactoring boundaries
*/
