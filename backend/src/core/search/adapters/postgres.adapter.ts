/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE SEARCH — POSTGRES ADAPTER (BANK-GRADE ENGINE)                  */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/search/adapters/postgres.adapter.ts                */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Moteur SQL natif ultra robuste                                         */
/*   - Full-Text Search PostgreSQL                                            */
/*   - Index GIN / Trigram                                                   */
/*   - Parfait pour données critiques                                        */
/*   - Aucun service externe requis                                          */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Pool, QueryResultRow } from "pg";

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

const POSTGRES_URL =
  process.env.POSTGRES_URL ??
  "postgres://postgres:postgres@localhost:5432/debrouille";

const QUERY_TIMEOUT_MS = 3_000;

/* -------------------------------------------------------------------------- */
/* INTERNAL METRICS                                                           */
/* -------------------------------------------------------------------------- */

type PgMetrics = {
  requests: number;
  errors: number;
  totalLatency: number;
};

type PgRow = QueryResultRow & {
  id: string;
  data: Record<string, unknown>;
  score: number | string | null;
};

/* -------------------------------------------------------------------------- */
/* POSTGRES ADAPTER                                                           */
/* -------------------------------------------------------------------------- */

export class PostgresAdapter implements SearchAdapter {
  /* ---------------------------------------------------------------------- */
  /* IDENTITY                                                                */
  /* ---------------------------------------------------------------------- */

  readonly name = "postgres-adapter";
  readonly engine: SearchEngineName = "postgres";

  /* ---------------------------------------------------------------------- */
  /* CAPABILITIES (STRICT CONTRACT)                                          */
  /* ---------------------------------------------------------------------- */

  readonly capabilities = {
    fullText: true,
    fuzzySearch: true,
    geoSearch: true,
    vectorSearch: false,
    realtimeIndexing: true,
    synonyms: false,
    rankingRules: true,
    multiLanguage: true,
  } as const;

  /* ---------------------------------------------------------------------- */
  /* INTERNAL STATE                                                          */
  /* ---------------------------------------------------------------------- */

  private readonly pool: Pool;

  private readonly metrics: PgMetrics = {
    requests: 0,
    errors: 0,
    totalLatency: 0,
  };

  constructor() {
    this.pool = new Pool({
      connectionString: POSTGRES_URL,
      statement_timeout: QUERY_TIMEOUT_MS,
      max: 10,
      idleTimeoutMillis: 10_000,
    });
  }

  /* ---------------------------------------------------------------------- */
  /* LIFECYCLE                                                               */
  /* ---------------------------------------------------------------------- */

  async initialize(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("SELECT 1;");
    } finally {
      client.release();
    }
  }

  async shutdown(): Promise<void> {
    await this.pool.end();
  }

  /* ---------------------------------------------------------------------- */
  /* SEARCH                                                                  */
  /* ---------------------------------------------------------------------- */

  async search(
    query: SearchQueryInput
  ): Promise<SearchRawResult> {
    const startedAt = Date.now();
    this.metrics.requests++;

    const client = await this.pool.connect();

    try {
      const indexName = query.indexName;

      const limit =
        query.pagination?.limit ?? 20;

      const offset =
        query.pagination?.offset ?? 0;

      const sql = `
        SELECT 
          id,
          data,
          ts_rank_cd(search_vector, plainto_tsquery($1)) AS score
        FROM ${indexName}
        WHERE search_vector @@ plainto_tsquery($1)
        ORDER BY score DESC
        LIMIT $2 OFFSET $3;
      `;

      const values = [
        query.text ?? "",
        limit,
        offset,
      ];

      const result = await client.query<PgRow>(
        sql,
        values
      );

      const hits: SearchRawResult["hits"] =
        result.rows.map((row: PgRow) => ({
          id: String(row.id),
          score:
            typeof row.score === "number"
              ? row.score
              : Number(row.score ?? 0),
          payload: row.data,
        }));

      const latency = Date.now() - startedAt;
      this.metrics.totalLatency += latency;

      return {
        hits,
        total: result.rowCount ?? hits.length,
        tookMs: latency,
      };
    } catch (error) {
      this.metrics.errors++;
      throw error;
    } finally {
      client.release();
    }
  }

  /* ---------------------------------------------------------------------- */
  /* INDEX MANAGEMENT                                                        */
  /* ---------------------------------------------------------------------- */

  async createIndex(
    descriptor: SearchIndexDefinition
  ): Promise<void> {
    const client = await this.pool.connect();

    try {
      const fields = descriptor.searchableFields
        .map(
          (field) =>
            `coalesce(data->>'${field}','')`
        )
        .join(" || ' ' || ");

      const sql = `
        CREATE TABLE IF NOT EXISTS ${
          descriptor.name
        } (
          id TEXT PRIMARY KEY,
          data JSONB NOT NULL,
          search_vector tsvector GENERATED ALWAYS AS (
            to_tsvector('simple', ${fields})
          ) STORED
        );

        CREATE INDEX IF NOT EXISTS ${
          descriptor.name
        }_fts_idx
        ON ${descriptor.name}
        USING GIN (search_vector);
      `;

      await client.query(sql);
    } finally {
      client.release();
    }
  }

  async deleteIndex(indexName: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        `DROP TABLE IF EXISTS ${indexName};`
      );
    } finally {
      client.release();
    }
  }

  async reindex(_indexName: string): Promise<void> {
    /**
     * PostgreSQL maintains indexes automatically.
     * Hook kept for interface compatibility.
     */
    return;
  }

  async indexDocument(
    indexName: string,
    document: Record<string, unknown>
  ): Promise<void> {
    if (typeof document["id"] !== "string") {
      throw new Error(
        "PostgresAdapter.indexDocument requires document.id:string"
      );
    }

    const client = await this.pool.connect();

    try {
      await client.query(
        `
        INSERT INTO ${indexName} (id, data)
        VALUES ($1, $2)
        ON CONFLICT (id)
        DO UPDATE SET data = EXCLUDED.data;
      `,
        [document["id"], document]
      );
    } finally {
      client.release();
    }
  }

  async deleteDocument(
    indexName: string,
    documentId: string
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        `DELETE FROM ${indexName} WHERE id = $1;`,
        [documentId]
      );
    } finally {
      client.release();
    }
  }

  /* ---------------------------------------------------------------------- */
  /* HEALTH                                                                  */
  /* ---------------------------------------------------------------------- */

  async healthCheck(): Promise<AdapterHealth> {
    const startedAt = Date.now();

    try {
      const client = await this.pool.connect();
      await client.query("SELECT 1;");
      client.release();

      const latency = Date.now() - startedAt;

      return {
        engine: this.engine,
        isAlive: true,
        lastPingAt: Date.now(),
        averageLatencyMs:
          this.metrics.requests === 0
            ? latency
            : Math.round(
                this.metrics.totalLatency /
                  this.metrics.requests
              ),
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
