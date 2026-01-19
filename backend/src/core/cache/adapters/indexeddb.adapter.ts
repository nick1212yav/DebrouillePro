/* -------------------------------------------------------------------------- */
/*  CORE / CACHE — INDEXEDDB ADAPTER                                           */
/*  File: core/cache/adapters/indexeddb.adapter.ts                            */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  📱 Persistent • Offline • Browser Native • Secure • Observable            */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  CacheAdapter,
  CacheAdapterContext,
} from "../cache.adapter.interface";

import {
  CacheKey,
  CacheValue,
  CacheStats,
} from "../cache.types";

/* -------------------------------------------------------------------------- */
/* 🧱 ERREURS                                                                  */
/* -------------------------------------------------------------------------- */

export class IndexedDBCacheAdapterError extends Error {
  constructor(message: string) {
    super(`[IndexedDBCacheAdapter] ${message}`);
  }
}

/* -------------------------------------------------------------------------- */
/* 🗄️ INDEXEDDB CACHE ADAPTER                                                  */
/* -------------------------------------------------------------------------- */

export class IndexedDBCacheAdapter implements CacheAdapter {
  readonly id = "indexeddb";

  private db?: IDBDatabase;
  private readonly stats: CacheStats = {
    hits: 0,
    misses: 0,
    entries: 0,
  };

  constructor(
    private readonly dbName: string = "core-cache",
    private readonly storeName: string = "entries",
    private readonly version: number = 1
  ) {}

  /* ------------------------------------------------------------------------ */
  /* 🔌 CONNECT                                                                */
  /* ------------------------------------------------------------------------ */

  async connect(): Promise<void> {
    if (typeof indexedDB === "undefined") {
      throw new IndexedDBCacheAdapterError(
        "IndexedDB not available"
      );
    }

    this.db = await new Promise<IDBDatabase>(
      (resolve, reject) => {
        const request = indexedDB.open(
          this.dbName,
          this.version
        );

        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName);
          }
        };

        request.onerror = () =>
          reject(
            new IndexedDBCacheAdapterError(
              "Failed to open IndexedDB"
            )
          );

        request.onsuccess = () =>
          resolve(request.result);
      }
    );
  }

  /* ------------------------------------------------------------------------ */
  /* 🔌 DISCONNECT                                                             */
  /* ------------------------------------------------------------------------ */

  async disconnect(): Promise<void> {
    this.db?.close();
    this.db = undefined;
  }

  /* ------------------------------------------------------------------------ */
  /* 📥 GET                                                                    */
  /* ------------------------------------------------------------------------ */

  async get<T>(
    key: CacheKey
  ): Promise<CacheValue<T> | null> {
    const value = await this.withStore<CacheValue<T> | null>(
      "readonly",
      (store) =>
        new Promise((resolve, reject) => {
          const req = store.get(key);
          req.onerror = () =>
            reject(
              new IndexedDBCacheAdapterError(
                "GET failed"
              )
            );
          req.onsuccess = () =>
            resolve(req.result ?? null);
        })
    );

    if (!value) {
      this.stats.misses++;
      return null;
    }

    if (
      value.metadata.expiresAt &&
      Date.now() >= value.metadata.expiresAt
    ) {
      await this.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return value;
  }

  /* ------------------------------------------------------------------------ */
  /* 📤 SET                                                                    */
  /* ------------------------------------------------------------------------ */

  async set<T>(
    key: CacheKey,
    value: CacheValue<T>
  ): Promise<void> {
    await this.withStore(
      "readwrite",
      (store) =>
        new Promise<void>((resolve, reject) => {
          const req = store.put(value, key);
          req.onerror = () =>
            reject(
              new IndexedDBCacheAdapterError(
                "SET failed"
              )
            );
          req.onsuccess = () => resolve();
        })
    );

    this.stats.entries++;
  }

  /* ------------------------------------------------------------------------ */
  /* ❌ DELETE                                                                 */
  /* ------------------------------------------------------------------------ */

  async delete(key: CacheKey): Promise<void> {
    await this.withStore(
      "readwrite",
      (store) =>
        new Promise<void>((resolve, reject) => {
          const req = store.delete(key);
          req.onerror = () =>
            reject(
              new IndexedDBCacheAdapterError(
                "DELETE failed"
              )
            );
          req.onsuccess = () => resolve();
        })
    );

    this.stats.entries = Math.max(
      0,
      this.stats.entries - 1
    );
  }

  /* ------------------------------------------------------------------------ */
  /* 🧹 CLEAR                                                                  */
  /* ------------------------------------------------------------------------ */

  async clear(): Promise<void> {
    await this.withStore(
      "readwrite",
      (store) =>
        new Promise<void>((resolve, reject) => {
          const req = store.clear();
          req.onerror = () =>
            reject(
              new IndexedDBCacheAdapterError(
                "CLEAR failed"
              )
            );
          req.onsuccess = () => resolve();
        })
    );

    this.stats.entries = 0;
  }

  /* ------------------------------------------------------------------------ */
  /* 📊 STATS                                                                  */
  /* ------------------------------------------------------------------------ */

  async stats(): Promise<CacheStats> {
    return { ...this.stats };
  }

  /* ------------------------------------------------------------------------ */
  /* 🧠 INTERNALS                                                              */
  /* ------------------------------------------------------------------------ */

  private async withStore<T>(
    mode: IDBTransactionMode,
    fn: (store: IDBObjectStore) => Promise<T>
  ): Promise<T> {
    if (!this.db) {
      throw new IndexedDBCacheAdapterError(
        "Database not connected"
      );
    }

    const tx = this.db.transaction(
      this.storeName,
      mode
    );
    const store = tx.objectStore(this.storeName);
    return fn(store);
  }
}
