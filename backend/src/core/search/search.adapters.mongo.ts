/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE SEARCH — MONGO SEARCH ADAPTER (WORLD #1)                        */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/search/search.adapters.mongo.ts                     */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  🎯 MISSION :                                                              */
/*   - Transformer MongoDB en moteur de recherche distribué                  */
/*   - Supporter full-text, filtres, scoring                                  */
/*   - Auto-adapter selon charge et latence                                   */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import mongoose, { Model } from "mongoose";
import { performance } from "perf_hooks";

import {
  SearchQuery,
  SearchResult,
  SearchSource,
} from "./search.types";

import {
  SearchSourceAdapter,
} from "./search.engine";

/* -------------------------------------------------------------------------- */
/* SEARCHABLE REGISTRY                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Chaque module peut enregistrer ses modèles ici.
 * Cela permet une recherche transversale sans coupling.
 */
type SearchableModel = {
  model: Model<any>;
  fields: string[];
  weight?: number;
};

const registry: SearchableModel[] = [];

/**
 * API publique d’enregistrement.
 */
export const registerSearchModel = (
  config: SearchableModel
) => {
  registry.push(config);
};

/* -------------------------------------------------------------------------- */
/* ADAPTER                                                                    */
/* -------------------------------------------------------------------------- */

export class MongoSearchAdapter
  implements SearchSourceAdapter
{
  readonly name = SearchSource.MONGO;
  readonly priority = 100;

  /* ======================================================================== */
  /* AVAILABILITY                                                             */
  /* ======================================================================== */

  async isAvailable(): Promise<boolean> {
    return mongoose.connection.readyState === 1;
  }

  /* ======================================================================== */
  /* EXECUTION                                                                */
  /* ======================================================================== */

  async execute(
    query: SearchQuery
  ): Promise<SearchResult[]> {
    const started = performance.now();

    const results: SearchResult[] = [];

    for (const entry of registry) {
      try {
        const docs = await this.searchModel(
          entry,
          query
        );

        results.push(...docs);
      } catch {
        continue;
      }
    }

    const duration =
      performance.now() - started;

    if (duration > 500) {
      console.warn(
        `[MongoSearchAdapter] Slow query detected: ${Math.round(
          duration
        )}ms`
      );
    }

    return results;
  }

  /* ======================================================================== */
  /* INTERNAL SEARCH                                                          */
  /* ======================================================================== */

  private async searchModel(
    entry: SearchableModel,
    query: SearchQuery
  ): Promise<SearchResult[]> {
    const limit = query.limit || 20;

    const projection: any = {
      score: { $meta: "textScore" },
    };

    const filter: any = {
      $text: {
        $search: query.text,
        $caseSensitive: false,
      },
    };

    const docs = await entry.model
      .find(filter, projection)
      .sort({ score: { $meta: "textScore" } })
      .limit(limit)
      .lean()
      .exec();

    return docs.map((doc) => ({
      id: String(doc._id),
      title: doc.title || doc.name || "Untitled",
      snippet: this.extractSnippet(
        doc,
        entry.fields,
        query.text
      ),
      score:
        (doc.score || 1) *
        (entry.weight || 1),
      source: SearchSource.MONGO,
      payload: doc,
    }));
  }

  /* ======================================================================== */
  /* SNIPPET EXTRACTION                                                       */
  /* ======================================================================== */

  private extractSnippet(
    doc: any,
    fields: string[],
    query: string
  ): string {
    const q = query.toLowerCase();

    for (const field of fields) {
      const value = String(
        doc[field] || ""
      ).toLowerCase();

      const index = value.indexOf(q);

      if (index >= 0) {
        const start = Math.max(0, index - 40);
        const end = Math.min(
          value.length,
          index + 80
        );

        return value.substring(start, end);
      }
    }

    return "";
  }
}

/* -------------------------------------------------------------------------- */
/* AUTO REGISTRATION                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Singleton export.
 */
export const mongoSearchAdapter =
  new MongoSearchAdapter();
