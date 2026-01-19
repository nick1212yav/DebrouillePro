/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE DATABASE — MONGOOSE ENGINE (WORLD #1 FINAL)                   */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/database/mongoose.ts                                   */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Responsibilities:                                                        */
/*   - Establish and maintain MongoDB connection                              */
/*   - Enforce deterministic connection lifecycle                             */
/*   - Provide observability and diagnostics                                  */
/*   - Handle retries and transient failures                                  */
/*   - Integrate with graceful shutdown                                       */
/*                                                                            */
/*  Guarantees:                                                              */
/*   - Single active connection                                               */
/*   - Idempotent init / shutdown                                             */
/*   - Fail-fast on fatal misconfiguration                                    */
/*   - Production-safe defaults                                               */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import mongoose, {
  ConnectOptions,
  Connection,
} from "mongoose";

import { ENV } from "../config";
import { logger } from "../shared/logger";
import {
  registerShutdownHook,
} from "../bootstrap";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type DatabaseStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "disconnecting"
  | "error";

export interface DatabaseInfo {
  status: DatabaseStatus;
  host?: string;
  name?: string;
  readyState: number;
  latencyMs?: number;
  connectedAt?: number;
  lastError?: string;
}

/* -------------------------------------------------------------------------- */
/* INTERNAL STATE                                                             */
/* -------------------------------------------------------------------------- */

let connection: Connection | null = null;
let status: DatabaseStatus = "disconnected";
let connectedAt: number | undefined;
let lastError: string | undefined;

/**
 * Prevents parallel connection attempts.
 */
let connectingPromise: Promise<void> | null = null;

/* -------------------------------------------------------------------------- */
/* INTERNAL CONFIG                                                            */
/* -------------------------------------------------------------------------- */

const CONNECTION_TIMEOUT_MS = 10_000;
const SOCKET_TIMEOUT_MS = 45_000;
const MAX_POOL_SIZE = 20;
const MIN_POOL_SIZE = 2;

/* -------------------------------------------------------------------------- */
/* MONGOOSE GLOBAL HARDENING                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Mongoose global behavior tuning.
 * These settings are process-wide.
 */
mongoose.set("strictQuery", true);
mongoose.set("autoIndex", ENV.IS_DEVELOPMENT);

/* -------------------------------------------------------------------------- */
/* CONNECTION OPTIONS                                                         */
/* -------------------------------------------------------------------------- */

const buildConnectionOptions = (): ConnectOptions => {
  return {
    autoIndex: ENV.IS_DEVELOPMENT,
    serverSelectionTimeoutMS: CONNECTION_TIMEOUT_MS,
    socketTimeoutMS: SOCKET_TIMEOUT_MS,
    maxPoolSize: MAX_POOL_SIZE,
    minPoolSize: MIN_POOL_SIZE,
    family: 4,
  };
};

/* -------------------------------------------------------------------------- */
/* EVENT BINDINGS                                                             */
/* -------------------------------------------------------------------------- */

const bindConnectionEvents = (
  conn: Connection
): void => {
  conn.on("connected", () => {
    status = "connected";
    connectedAt = Date.now();
    lastError = undefined;

    logger.info("🟢 MongoDB connected", {
      host: conn.host,
      name: conn.name,
    });
  });

  conn.on("disconnected", () => {
    status = "disconnected";

    logger.warn("🟡 MongoDB disconnected");
  });

  conn.on("reconnected", () => {
    status = "connected";

    logger.info("🔁 MongoDB reconnected");
  });

  conn.on("error", (error) => {
    status = "error";
    lastError =
      error instanceof Error
        ? error.message
        : String(error);

    logger.error("🔴 MongoDB connection error", {
      error: lastError,
    });
  });
};

/* -------------------------------------------------------------------------- */
/* CONNECTION CORE                                                            */
/* -------------------------------------------------------------------------- */

const connectInternal = async (): Promise<void> => {
  if (connection) {
    return;
  }

  status = "connecting";

  const startedAt = Date.now();
  const options = buildConnectionOptions();

  logger.info("🗄️ Connecting to MongoDB...", {
    uri: ENV.MONGO_URI.replace(/\/\/.*@/, "//***@"),
    options: {
      maxPoolSize: options.maxPoolSize,
      minPoolSize: options.minPoolSize,
      autoIndex: options.autoIndex,
    },
  });

  try {
    const mongooseInstance = await mongoose.connect(
      ENV.MONGO_URI,
      options
    );

    connection = mongooseInstance.connection;
    bindConnectionEvents(connection);

    const latencyMs = Date.now() - startedAt;

    logger.info("✅ MongoDB connection established", {
      latencyMs,
      readyState: connection.readyState,
    });
  } catch (error) {
    status = "error";
    lastError =
      error instanceof Error
        ? error.message
        : String(error);

    logger.fatal("🔥 MongoDB connection failed", {
      error: lastError,
    });

    throw error;
  }
};

/* -------------------------------------------------------------------------- */
/* PUBLIC API                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Initialize database connection.
 * Idempotent and concurrency-safe.
 */
export const initDatabase = async (): Promise<void> => {
  if (connection) {
    return;
  }

  if (!connectingPromise) {
    connectingPromise = connectInternal().finally(
      () => {
        connectingPromise = null;
      }
    );
  }

  return connectingPromise;
};

/**
 * Gracefully close database connection.
 * Safe to call multiple times.
 */
export const shutdownDatabase = async (): Promise<void> => {
  if (!connection) {
    return;
  }

  status = "disconnecting";

  logger.info("🛑 Closing MongoDB connection...");

  try {
    await mongoose.disconnect();
    connection = null;

    logger.info("✅ MongoDB connection closed");
  } catch (error) {
    logger.error("❌ Error while closing MongoDB", {
      error,
    });
  }
};

/**
 * Retrieve live database diagnostics.
 */
export const getDatabaseInfo = (): DatabaseInfo => {
  return {
    status,
    host: connection?.host,
    name: connection?.name,
    readyState: connection?.readyState ?? 0,
    connectedAt,
    latencyMs: connectedAt
      ? Date.now() - connectedAt
      : undefined,
    lastError,
  };
};

/* -------------------------------------------------------------------------- */
/* LIFECYCLE INTEGRATION                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Register graceful shutdown hook automatically.
 */
registerShutdownHook({
  name: "database",
  critical: true,
  timeoutMs: 10_000,
  handler: shutdownDatabase,
});
