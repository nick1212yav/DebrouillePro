/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE SEARCH — MEMORY ADAPTER (INSTANT ENGINE)                       */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/search/adapters/memory.adapter.ts                  */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Moteur ultra rapide en mémoire                                         */
/*   - Zéro dépendance                                                        */
/*   - Offline-first                                                         */
/*   - Fallback de secours                                                    */
/*   - Parfait pour tests, edge, cache                                        */
/*                                                                            */
/* -------------------------------------------------------------------------- */

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
/* INTERNAL TYPES                                                             */
/* -------------------------------------------------------------------------- */

type MemoryDocument = {
  id: string;
  payload: Record<string, unknown>;
  searchableText: string;
};

type MemoryIndex = {
  name: string;
  documents: Map<string, MemoryDocument>;
};

/* -------------------------------------------------------------------------- */
/* MEMORY ADAPTER                                                             */
/* -------------------------------------------------------------------------- */

export class MemoryAdapter implements SearchAdapter {
  /* ---------------------------------------------------------------------- */
  /* IDENTITY                                                                */
  /* ---------------------------------------------------------------------- */

  readonly name = "memory-adapter";
  readonly engine: SearchEngineName = "memory";

  /* ---------------------------------------------------------------------- */
  /* CAPABILITIES (STRICT CONTRACT)                                          */
  /* ---------------------------------------------------------------------- */

  readonly capabilities = {
    fullText: true,
    fuzzySearch: false,
    geoSearch: false,
    vectorSearch: false,
    realtimeIndexing: true,
    synonyms: false,
    rankingRules: false,
    multiLanguage: false,
  } as const;

  /* ---------------------------------------------------------------------- */
  /* INTERNAL STATE                                                          */
  /* ---------------------------------------------------------------------- */

  private readonly indexes = new Map<
    string,
    MemoryIndex
  >();

  private readonly metrics = {
    requests: 0,
    indexedDocuments: 0,
    totalLatency: 0,
  };

  /* ---------------------------------------------------------------------- */
  /* LIFECYCLE                                                               */
  /* ---------------------------------------------------------------------- */

  async initialize(): Promise<void> {
    // Nothing to initialize (in-memory)
  }

  async shutdown(): Promise<void> {
    this.indexes.clear();
  }

  /* ---------------------------------------------------------------------- */
  /* SEARCH                                                                  */
  /* ---------------------------------------------------------------------- */

  async search(
    query: SearchQueryInput
  ): Promise<SearchRawResult> {
    const startedAt = Date.now();
    this.metrics.requests++;

    const indexName = query.indexName;
    const index = this.indexes.get(indexName);

    if (!index) {
      return {
        hits: [],
        total: 0,
        tookMs: 0,
      };
    }

    const text = (query.text ?? "").toLowerCase();

    const hits: SearchRawResult["hits"] = [];

    for (const doc of index.documents.values()) {
      if (doc.searchableText.includes(text)) {
        hits.push({
          id: doc.id,
          score: this.computeScore(
            doc.searchableText,
            text
          ),
          payload: doc.payload,
        });
      }
    }

    hits.sort(
      (a: SearchRawResult["hits"][number], b: SearchRawResult["hits"][number]) =>
        b.score - a.score
    );

    const offset =
      query.pagination?.offset ?? 0;

    const limit =
      query.pagination?.limit ?? 20;

    const sliced = hits.slice(
      offset,
      offset + limit
    );

    const latency = Date.now() - startedAt;
    this.metrics.totalLatency += latency;

    return {
      hits: sliced,
      total: hits.length,
      tookMs: latency,
    };
  }

  /* ---------------------------------------------------------------------- */
  /* INDEX MANAGEMENT                                                        */
  /* ---------------------------------------------------------------------- */

  async createIndex(
    descriptor: SearchIndexDefinition
  ): Promise<void> {
    if (this.indexes.has(descriptor.name)) {
      return;
    }

    this.indexes.set(descriptor.name, {
      name: descriptor.name,
      documents: new Map(),
    });
  }

  async deleteIndex(indexName: string): Promise<void> {
    this.indexes.delete(indexName);
  }

  async reindex(_indexName: string): Promise<void> {
    /**
     * In-memory engine does not require reindexing.
     * Hook kept for interface compatibility.
     */
    return;
  }

  async indexDocument(
    indexName: string,
    document: Record<string, unknown>
  ): Promise<void> {
    const index = this.indexes.get(indexName);
    if (!index) return;

    if (typeof document["id"] !== "string") {
      throw new Error(
        "MemoryAdapter.indexDocument requires document.id:string"
      );
    }

    const text = JSON.stringify(document).toLowerCase();

    const memoryDoc: MemoryDocument = {
      id: document["id"],
      payload: document,
      searchableText: text,
    };

    index.documents.set(memoryDoc.id, memoryDoc);
    this.metrics.indexedDocuments++;
  }

  async deleteDocument(
    indexName: string,
    documentId: string
  ): Promise<void> {
    const index = this.indexes.get(indexName);
    if (!index) return;

    if (index.documents.delete(documentId)) {
      this.metrics.indexedDocuments--;
    }
  }

  /* ---------------------------------------------------------------------- */
  /* SCORING                                                                 */
  /* ---------------------------------------------------------------------- */

  private computeScore(
    content: string,
    query: string
  ): number {
    if (!query) return 0;

    const occurrences =
      content.split(query).length - 1;

    return occurrences * 10 + query.length;
  }

  /* ---------------------------------------------------------------------- */
  /* HEALTH                                                                  */
  /* ---------------------------------------------------------------------- */

  async healthCheck(): Promise<AdapterHealth> {
    return {
      engine: this.engine,
      isAlive: true,
      lastPingAt: Date.now(),
      indexedDocuments: this.metrics.indexedDocuments,
      averageLatencyMs:
        this.metrics.requests === 0
          ? 0
          : Math.round(
              this.metrics.totalLatency /
                this.metrics.requests
            ),
      errorRate: 0,
    };
  }
}
