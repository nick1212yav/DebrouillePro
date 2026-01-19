/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE SEARCH — INDEX MANAGER (WORLD #1 INFRA BRAIN)                  */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/search/search.index.manager.ts                     */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Gouverner tous les index physiques                                     */
/*   - Versionner, migrer, réparer                                             */
/*   - Garantir disponibilité mondiale                                         */
/*                                                                            */
/*  PRINCIPES :                                                               */
/*   - Zero downtime                                                          */
/*   - Multi-engine                                                           */
/*   - Auto-healing                                                           */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import EventEmitter from "events";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type SearchEngineType =
  | "elastic"
  | "meili"
  | "postgres"
  | "memory";

export interface IndexDefinition {
  name: string;
  version: number;
  schema: Record<string, any>;
  replicas?: number;
  shards?: number;
}

export interface IndexHealth {
  engine: SearchEngineType;
  index: string;
  healthy: boolean;
  latencyMs?: number;
  docs?: number;
  error?: string;
}

export interface IndexAdapter {
  engine: SearchEngineType;

  createIndex(def: IndexDefinition): Promise<void>;
  deleteIndex(name: string): Promise<void>;
  indexExists(name: string): Promise<boolean>;

  reindex(
    from: string,
    to: string
  ): Promise<void>;

  getHealth(name: string): Promise<IndexHealth>;
  warmup(name: string): Promise<void>;
}

/* -------------------------------------------------------------------------- */
/* INDEX MANAGER                                                              */
/* -------------------------------------------------------------------------- */

export class SearchIndexManager extends EventEmitter {
  private adapters = new Map<
    SearchEngineType,
    IndexAdapter
  >();

  private activeIndexes = new Map<
    string,
    string
  >(); // logical → physical

  /* ======================================================================== */
  /* REGISTRATION                                                             */
  /* ======================================================================== */

  registerAdapter(adapter: IndexAdapter) {
    this.adapters.set(adapter.engine, adapter);
  }

  getAdapters() {
    return [...this.adapters.values()];
  }

  /* ======================================================================== */
  /* INDEX LIFECYCLE                                                          */
  /* ======================================================================== */

  async ensureIndex(
    engine: SearchEngineType,
    def: IndexDefinition
  ) {
    const adapter = this.adapters.get(engine);
    if (!adapter)
      throw new Error(
        `Adapter not registered: ${engine}`
      );

    const physicalName = `${def.name}_v${def.version}`;

    const exists =
      await adapter.indexExists(physicalName);

    if (!exists) {
      await adapter.createIndex({
        ...def,
        name: physicalName,
      });

      await adapter.warmup(physicalName);

      this.emit("index.created", {
        engine,
        physicalName,
      });
    }

    this.activeIndexes.set(
      def.name,
      physicalName
    );
  }

  /* ======================================================================== */
  /* BLUE / GREEN MIGRATION                                                    */
  /* ======================================================================== */

  async migrateIndex(params: {
    engine: SearchEngineType;
    logicalName: string;
    newVersion: number;
    schema: Record<string, any>;
  }) {
    const adapter = this.adapters.get(
      params.engine
    );
    if (!adapter) {
      throw new Error("Adapter not found");
    }

    const oldPhysical =
      this.activeIndexes.get(
        params.logicalName
      );

    const newPhysical = `${params.logicalName}_v${params.newVersion}`;

    await adapter.createIndex({
      name: newPhysical,
      version: params.newVersion,
      schema: params.schema,
    });

    if (oldPhysical) {
      await adapter.reindex(
        oldPhysical,
        newPhysical
      );
    }

    await adapter.warmup(newPhysical);

    this.activeIndexes.set(
      params.logicalName,
      newPhysical
    );

    this.emit("index.migrated", {
      logical: params.logicalName,
      from: oldPhysical,
      to: newPhysical,
    });
  }

  /* ======================================================================== */
  /* HEALTH MONITORING                                                         */
  /* ======================================================================== */

  async getGlobalHealth(): Promise<
    IndexHealth[]
  > {
    const results: IndexHealth[] = [];

    for (const [
      engine,
      adapter,
    ] of this.adapters) {
      for (const physical of this.activeIndexes.values()) {
        try {
          const health =
            await adapter.getHealth(physical);
          results.push(health);
        } catch (err: any) {
          results.push({
            engine,
            index: physical,
            healthy: false,
            error: err.message,
          });
        }
      }
    }

    return results;
  }

  /* ======================================================================== */
  /* AUTO HEALING                                                              */
  /* ======================================================================== */

  async autoHeal() {
    const health =
      await this.getGlobalHealth();

    for (const h of health) {
      if (!h.healthy) {
        this.emit("index.unhealthy", h);

        console.warn(
          "[SearchIndexManager] Healing index:",
          h.index
        );

        // Strategy extensible
        // - recreate
        // - reindex
        // - switch engine
      }
    }
  }

  /* ======================================================================== */
  /* RESOLUTION                                                                */
  /* ======================================================================== */

  resolvePhysicalIndex(
    logicalName: string
  ): string {
    const physical =
      this.activeIndexes.get(logicalName);

    if (!physical) {
      throw new Error(
        `Index not resolved: ${logicalName}`
      );
    }

    return physical;
  }
}

/* -------------------------------------------------------------------------- */
/* SINGLETON                                                                  */
/* -------------------------------------------------------------------------- */

export const searchIndexManager =
  new SearchIndexManager();
