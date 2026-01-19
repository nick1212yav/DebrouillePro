/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE SEARCH — ELASTIC ADAPTER (WORLD #1 INDUSTRIAL GRADE)           */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/search/adapters/elastic.adapter.ts                */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Connecter Débrouille à ElasticSearch                                   */
/*   - Offrir résilience, performance, observabilité                          */
/*   - Auto-mapping intelligent                                               */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Client } from "@elastic/elasticsearch";

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

const ELASTIC_NODE =
  process.env.ELASTIC_NODE ?? "http://localhost:9200";

const REQUEST_TIMEOUT_MS = 3_000;

/* -------------------------------------------------------------------------- */
/* INTERNAL METRICS                                                           */
/* -------------------------------------------------------------------------- */

type ElasticMetrics = {
  requests: number;
  errors: number;
  totalLatency: number;
};

type ElasticHitSource = Record<string, unknown>;

type ElasticHit = {
  _id?: string;
  _score?: number | null;
  _source?: ElasticHitSource;
};

/* -------------------------------------------------------------------------- */
/* ELASTIC ADAPTER                                                            */
/* -------------------------------------------------------------------------- */

export class ElasticSearchAdapter
  implements SearchAdapter
{
  /* ---------------------------------------------------------------------- */
  /* IDENTITY                                                                */
  /* ---------------------------------------------------------------------- */

  readonly name = "elastic-adapter";
  readonly engine: SearchEngineName = "elastic";

  /* ---------------------------------------------------------------------- */
  /* CAPABILITIES                                                            */
  /* ---------------------------------------------------------------------- */

  readonly capabilities = {
    fullText: true,
    fuzzySearch: true,
    geoSearch: true,
    vectorSearch: true,
    realtimeIndexing: true,
    synonyms: true,
    rankingRules: true,
    multiLanguage: true,
  } as const;

  /* ---------------------------------------------------------------------- */
  /* INTERNALS                                                               */
  /* ---------------------------------------------------------------------- */

  private readonly client: Client;

  private readonly metrics: ElasticMetrics = {
    requests: 0,
    errors: 0,
    totalLatency: 0,
  };

  constructor() {
    this.client = new Client({
      node: ELASTIC_NODE,
      requestTimeout: REQUEST_TIMEOUT_MS,
      maxRetries: 3,
    });
  }

  /* ---------------------------------------------------------------------- */
  /* LIFECYCLE                                                               */
  /* ---------------------------------------------------------------------- */

  async initialize(): Promise<void> {
    // Elastic initializes lazily
    await this.client.ping();
  }

  async shutdown(): Promise<void> {
    // No hard close guaranteed by SDK, keep safe noop
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

      const limit =
        query.pagination?.limit ?? 20;

      const offset =
        query.pagination?.offset ?? 0;

      const response = await this.client.search<
        ElasticHitSource
      >({
        index: indexName,
        size: limit,
        from: offset,
        query: {
          multi_match: {
            query: query.text ?? "",
            fields: ["*"],
            fuzziness: "AUTO",
          },
        },
      });

      const hits: SearchRawResult["hits"] =
        response.hits.hits.map(
          (hit: ElasticHit) => ({
            id: String(hit._id ?? ""),
            score: Number(hit._score ?? 0),
            payload:
              (hit._source ??
                {}) as Record<string, unknown>,
          })
        );

      const latency = Date.now() - startedAt;
      this.metrics.totalLatency += latency;

      return {
        hits,
        total: Number(
          typeof response.hits.total === "object"
            ? response.hits.total.value
            : hits.length
        ),
        tookMs: latency,
      };
    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }

  /* ---------------------------------------------------------------------- */
  /* INDEX MANAGEMENT                                                        */
  /* ---------------------------------------------------------------------- */

  async createIndex(
    descriptor: SearchIndexDefinition
  ): Promise<void> {
    const exists = await this.client.indices.exists({
      index: descriptor.name,
    });

    if (exists) return;

    await this.client.indices.create({
      index: descriptor.name,
      mappings: {
        dynamic: true,
        properties: descriptor.searchableFields.reduce(
          (acc, field) => {
            acc[field] = { type: "text" };
            return acc;
          },
          {} as Record<string, unknown>
        ),
      },
    });
  }

  async deleteIndex(indexName: string): Promise<void> {
    await this.client.indices.delete({
      index: indexName,
    });
  }

  async reindex(_indexName: string): Promise<void> {
    /**
     * Reindex orchestration handled upstream.
     */
    return;
  }

  async indexDocument(
    indexName: string,
    document: Record<string, unknown>
  ): Promise<void> {
    if (typeof document["id"] !== "string") {
      throw new Error(
        "ElasticAdapter.indexDocument requires document.id:string"
      );
    }

    await this.client.index({
      index: indexName,
      id: document["id"],
      document,
      refresh: true,
    });
  }

  async deleteDocument(
    indexName: string,
    documentId: string
  ): Promise<void> {
    await this.client.delete({
      index: indexName,
      id: documentId,
    });
  }

  /* ---------------------------------------------------------------------- */
  /* HEALTH                                                                  */
  /* ---------------------------------------------------------------------- */

  async healthCheck(): Promise<AdapterHealth> {
    const startedAt = Date.now();

    try {
      await this.client.ping();

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
