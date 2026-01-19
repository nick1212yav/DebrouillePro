/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE SEARCH — MEILISEARCH ADAPTER (ULTRA FAST EDGE ENGINE)          */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/search/adapters/meilisearch.adapter.ts             */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Moteur ultra rapide pour UX instantanée                                */
/*   - Typo tolerance native                                                  */
/*   - Edge / mobile friendly                                                 */
/*   - Zéro maintenance                                                       */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { MeiliSearch } from "meilisearch";

import {
  SearchAdapter,
  AdapterHealth,
} from "./adapter.interface";

import {
  SearchQueryInput,
  SearchRawResult,
  SearchEngineName,
  SearchIndexDefinition,
} from "../search.types";

/* -------------------------------------------------------------------------- */
/* CONFIG                                                                     */
/* -------------------------------------------------------------------------- */

const MEILI_HOST =
  process.env.MEILI_HOST ?? "http://localhost:7700";

const MEILI_API_KEY =
  process.env.MEILI_API_KEY ?? "masterKey";

const REQUEST_TIMEOUT_MS = 2_000;

/* -------------------------------------------------------------------------- */
/* INTERNAL METRICS                                                           */
/* -------------------------------------------------------------------------- */

type MeiliMetrics = {
  requests: number;
  errors: number;
  totalLatency: number;
};

/* -------------------------------------------------------------------------- */
/* MEILI ADAPTER                                                              */
/* -------------------------------------------------------------------------- */

export class MeilisearchAdapter
  implements SearchAdapter
{
  /* ---------------------------------------------------------------------- */
  /* IDENTITY                                                                */
  /* ---------------------------------------------------------------------- */

  readonly name = "meilisearch-adapter";
  readonly engine: SearchEngineName = "meilisearch";

  /* ---------------------------------------------------------------------- */
  /* CAPABILITIES                                                            */
  /* ---------------------------------------------------------------------- */

  readonly capabilities = {
    fullText: true,
    fuzzySearch: true,
    geoSearch: false,
    vectorSearch: false,
    realtimeIndexing: true,
    synonyms: true,
    rankingRules: true,
    multiLanguage: true,
  } as const;

  /* ---------------------------------------------------------------------- */
  /* INTERNALS                                                               */
  /* ---------------------------------------------------------------------- */

  private readonly client: MeiliSearch;

  private readonly metrics: MeiliMetrics = {
    requests: 0,
    errors: 0,
    totalLatency: 0,
  };

  constructor() {
    this.client = new MeiliSearch({
      host: MEILI_HOST,
      apiKey: MEILI_API_KEY,
      timeout: REQUEST_TIMEOUT_MS,
    });
  }

  /* ---------------------------------------------------------------------- */
  /* LIFECYCLE                                                               */
  /* ---------------------------------------------------------------------- */

  async initialize(): Promise<void> {
    // Lazy connection handled by Meili SDK.
    await this.client.health();
  }

  async shutdown(): Promise<void> {
    // Meili client has no explicit close.
  }

  /* ---------------------------------------------------------------------- */
  /* SEARCH                                                                  */
  /* ---------------------------------------------------------------------- */

  async search(
    query: SearchQueryInput
  ): Promise<SearchRawResult> {
    const startedAt = Date.now();
    this.metrics.requests++;

    try {
      const indexName = query.indexName;
      const index = this.client.index(indexName);

      const limit =
        query.pagination?.limit ?? 20;

      const offset =
        query.pagination?.offset ?? 0;

      const result = await index.search(
        query.text ?? "",
        { limit, offset }
      );

      const hits = result.hits.map(
        (
          doc: Record<string, unknown>,
          i: number
        ) => ({
          id:
            typeof doc["id"] === "string"
              ? String(doc["id"])
              : String(i),
          score: 1,
          payload: doc,
        })
      );

      return {
        hits,
        total: Number(
          result.estimatedTotalHits ?? hits.length
        ),
        tookMs: Date.now() - startedAt,
      };
    } catch (error) {
      this.metrics.errors++;
      throw error;
    } finally {
      this.metrics.totalLatency +=
        Date.now() - startedAt;
    }
  }

  /* ---------------------------------------------------------------------- */
  /* INDEX MANAGEMENT                                                        */
  /* ---------------------------------------------------------------------- */

  async createIndex(
    descriptor: SearchIndexDefinition
  ): Promise<void> {
    try {
      await this.client.createIndex(
        descriptor.name,
        {
          primaryKey: descriptor.primaryKey,
        }
      );

      const index = this.client.index(
        descriptor.name
      );

      await index.updateSearchableAttributes(
        descriptor.searchableFields
      );
    } catch {
      // Index already exists → ignore safely
    }
  }

  async deleteIndex(indexName: string): Promise<void> {
    await this.client.deleteIndex(indexName);
  }

  async reindex(_indexName: string): Promise<void> {
    // Meili rebuilds indexes automatically.
    return;
  }

  async indexDocument(
    indexName: string,
    document: Record<string, unknown>
  ): Promise<void> {
    const index = this.client.index(indexName);
    await index.addDocuments([document]);
  }

  async deleteDocument(
    indexName: string,
    documentId: string
  ): Promise<void> {
    const index = this.client.index(indexName);
    await index.deleteDocument(documentId);
  }

  /* ---------------------------------------------------------------------- */
  /* HEALTH                                                                  */
  /* ---------------------------------------------------------------------- */

  async healthCheck(): Promise<AdapterHealth> {
    const startedAt = Date.now();

    try {
      await this.client.health();

      const latency = Date.now() - startedAt;

      const avgLatency =
        this.metrics.requests === 0
          ? latency
          : Math.round(
              this.metrics.totalLatency /
                this.metrics.requests
            );

      return {
        engine: this.engine,
        isAlive: true,
        lastPingAt: Date.now(),
        averageLatencyMs: avgLatency,
        errorRate:
          this.metrics.requests === 0
            ? 0
            : this.metrics.errors /
              this.metrics.requests,
        indexedDocuments: 0,
      };
    } catch {
      return {
        engine: this.engine,
        isAlive: false,
        averageLatencyMs: 0,
        errorRate: 1,
        indexedDocuments: 0,
      };
    }
  }
}
