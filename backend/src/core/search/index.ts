/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE SEARCH — GLOBAL BOOTSTRAP & REGISTRY (WORLD #1)                */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/search/index.ts                                    */
/* -------------------------------------------------------------------------- */

import { SearchService } from "./search.service";
import { SearchAnalytics } from "./search.analytics";
import { SearchCache } from "./search.cache";
import { SearchIndexManager } from "./search.index.manager";

import { SearchAdapter } from "./adapters/adapter.interface";

import { ElasticSearchAdapter } from "./adapters/elastic.adapter";
import { MeilisearchAdapter } from "./adapters/meilisearch.adapter";
import { PostgresAdapter } from "./adapters/postgres.adapter";
import { MemoryAdapter } from "./adapters/memory.adapter";

/* Intelligence Engines */
import { SemanticEngine } from "./intelligence/semantic.engine";
import { IntentEngine } from "./intelligence/intent.engine";
import { PersonalizationEngine } from "./intelligence/personalization.engine";
import { SuggestionEngine } from "./intelligence/suggestion.engine";

/* Rules Engines */
import { AntiSpamRulesEngine } from "./rules/anti-spam.rules";
import { TrustBoostRulesEngine } from "./rules/trust-boost.rules";
import { GeoPriorityRulesEngine } from "./rules/geo-priority.rules";
import { FreshnessRulesEngine } from "./rules/freshness.rules";

/* -------------------------------------------------------------------------- */
/* REGISTRY TYPES                                                             */
/* -------------------------------------------------------------------------- */

export type SearchEngineStatus =
  | "BOOTING"
  | "READY"
  | "DEGRADED"
  | "OFFLINE";

export interface SearchEngineHealth {
  adapter: string;
  latencyMs?: number;
  errorRate?: number;
  lastCheckAt: Date;
  healthy: boolean;
}

/* -------------------------------------------------------------------------- */
/* GLOBAL REGISTRY                                                            */
/* -------------------------------------------------------------------------- */

class SearchRegistry {
  private static adapters =
    new Map<string, SearchAdapter>();

  private static activeAdapter: SearchAdapter | null =
    null;

  private static health =
    new Map<string, SearchEngineHealth>();

  private static status: SearchEngineStatus =
    "BOOTING";

  /* Intelligence */
  static semantic = new SemanticEngine();
  static intent = new IntentEngine();
  static personalization =
    new PersonalizationEngine();
  static suggestion =
    new SuggestionEngine();

  /* Rules */
  static rules = {
    antiSpam: new AntiSpamRulesEngine(),
    trust: new TrustBoostRulesEngine(),
    geo: new GeoPriorityRulesEngine(),
    freshness: new FreshnessRulesEngine(),
  };

  /* Infra */
  static cache = new SearchCache();
  static analytics = new SearchAnalytics();
  static indexManager = new SearchIndexManager();

  /* ---------------------------------------------------------------------- */
  /* ADAPTER REGISTRATION                                                    */
  /* ---------------------------------------------------------------------- */

  static registerAdapter(adapter: SearchAdapter): void {
    this.adapters.set(adapter.name, adapter);
  }

  static getAdapters(): SearchAdapter[] {
    return Array.from(this.adapters.values());
  }

  static getActiveAdapter(): SearchAdapter {
    if (!this.activeAdapter) {
      throw new Error("No active SearchAdapter");
    }
    return this.activeAdapter;
  }

  /* ---------------------------------------------------------------------- */
  /* HEALTH MONITORING                                                       */
  /* ---------------------------------------------------------------------- */

  static async probeAdapters(): Promise<void> {
    for (const adapter of this.adapters.values()) {
      try {
        const start = Date.now();
        await adapter.healthCheck();

        const latency = Date.now() - start;

        this.health.set(adapter.name, {
          adapter: adapter.name,
          latencyMs: latency,
          lastCheckAt: new Date(),
          healthy: true,
        });
      } catch {
        this.health.set(adapter.name, {
          adapter: adapter.name,
          lastCheckAt: new Date(),
          healthy: false,
        });
      }
    }
  }

  static getHealth(): SearchEngineHealth[] {
    return Array.from(this.health.values());
  }

  /* ---------------------------------------------------------------------- */
  /* ADAPTER SELECTION                                                       */
  /* ---------------------------------------------------------------------- */

  static resolveBestAdapter(): SearchAdapter {
    const healthy = this.getHealth().filter(
      (h) => h.healthy
    );

    if (healthy.length === 0) {
      throw new Error("No healthy search adapter");
    }

    healthy.sort((a, b) => {
      return (
        (a.latencyMs ?? Number.MAX_SAFE_INTEGER) -
        (b.latencyMs ?? Number.MAX_SAFE_INTEGER)
      );
    });

    const best = healthy[0];
    if (!best) {
      throw new Error("No adapter candidate found");
    }

    const adapter = this.adapters.get(best.adapter);
    if (!adapter) {
      throw new Error("Adapter registry corruption");
    }

    return adapter;
  }

  static async activateBestAdapter(): Promise<void> {
    await this.probeAdapters();
    this.activeAdapter = this.resolveBestAdapter();
    this.status = "READY";
  }

  /* ---------------------------------------------------------------------- */
  /* STATUS                                                                  */
  /* ---------------------------------------------------------------------- */

  static getStatus(): SearchEngineStatus {
    return this.status;
  }

  static degrade(reason?: string): void {
    this.status = "DEGRADED";
    console.warn("SEARCH_ENGINE_DEGRADED", reason);
  }

  static offline(reason?: string): void {
    this.status = "OFFLINE";
    console.error("SEARCH_ENGINE_OFFLINE", reason);
  }
}

/* -------------------------------------------------------------------------- */
/* BOOTSTRAP                                                                 */
/* -------------------------------------------------------------------------- */

async function bootstrapSearchEngine(): Promise<void> {
  try {
    console.info("🔍 Bootstrapping Search Engine...");

    /* Register adapters */
    SearchRegistry.registerAdapter(
      new ElasticSearchAdapter()
    );
    SearchRegistry.registerAdapter(
      new MeilisearchAdapter()
    );
    SearchRegistry.registerAdapter(
      new PostgresAdapter()
    );
    SearchRegistry.registerAdapter(
      new MemoryAdapter()
    );

    /* Index warmup (safe optional) */
    await SearchRegistry.indexManager.initialize?.();

    /* Adapter selection */
    await SearchRegistry.activateBestAdapter();

    console.info(
      "✅ Search Engine ready with adapter:",
      SearchRegistry.getActiveAdapter().name
    );
  } catch (error) {
    SearchRegistry.offline(
      error instanceof Error
        ? error.message
        : "Unknown bootstrap failure"
    );
  }
}

/* Auto-bootstrap */
void bootstrapSearchEngine();

/* -------------------------------------------------------------------------- */
/* PUBLIC API                                                                */
/* -------------------------------------------------------------------------- */

export const SearchEngine = {
  /* Status */
  getStatus: () => SearchRegistry.getStatus(),
  getHealth: () => SearchRegistry.getHealth(),

  /* Core services */
  service: SearchService,
  cache: SearchRegistry.cache,
  analytics: SearchRegistry.analytics,

  /* Intelligence */
  semantic: SearchRegistry.semantic,
  intent: SearchRegistry.intent,
  personalization:
    SearchRegistry.personalization,
  suggestion: SearchRegistry.suggestion,

  /* Rules */
  rules: SearchRegistry.rules,

  /* Adapter */
  getAdapter: () =>
    SearchRegistry.getActiveAdapter(),

  /* Emergency fallback */
  forceAdapter(name: string): void {
    const adapter =
      (SearchRegistry as unknown as {
        adapters: Map<string, SearchAdapter>;
        activeAdapter: SearchAdapter | null;
      }).adapters.get(name);

    if (!adapter) {
      throw new Error(
        `Adapter ${name} not found`
      );
    }

    (SearchRegistry as unknown as {
      activeAdapter: SearchAdapter | null;
    }).activeAdapter = adapter;

    console.warn("⚠️ Forced adapter:", name);
  },
};
