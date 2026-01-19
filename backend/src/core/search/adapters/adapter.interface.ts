/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE SEARCH — ADAPTER INTERFACE (WORLD #1 CONTRACT)                 */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/search/adapters/adapter.interface.ts               */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Normaliser TOUS les moteurs de recherche                               */
/*   - Garantir interchangeabilité totale                                    */
/*   - Isoler le Core des dépendances externes                                 */
/*                                                                            */
/*  OBJECTIF :                                                                */
/*   - Remplacer Elastic par Meili, Postgres, Cloud AI sans refactor          */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import type {
  SearchQueryInput,
  SearchRawResult,
  SearchEngineName,
  SearchIndexDefinition,
} from "../search.types";

/* -------------------------------------------------------------------------- */
/* HEALTH METRICS                                                             */
/* -------------------------------------------------------------------------- */

export interface AdapterHealth {
  /** Nom du moteur */
  engine: SearchEngineName;

  /** Disponibilité temps réel */
  isAlive: boolean;

  /** Timestamp dernier ping OK */
  lastPingAt?: number;

  /** Latence moyenne observée */
  averageLatencyMs: number;

  /** Taux d'erreur [0..1] */
  errorRate: number;

  /** Nombre de documents indexés */
  indexedDocuments: number;
}

/* -------------------------------------------------------------------------- */
/* CAPABILITIES                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Capacités déclaratives d’un moteur de recherche.
 * ⚠️ Tous les champs sont obligatoires pour garantir la comparabilité.
 */
export interface AdapterCapabilities {
  fullText: boolean;
  fuzzySearch: boolean;
  geoSearch: boolean;
  vectorSearch: boolean;
  realtimeIndexing: boolean;
  synonyms: boolean;
  rankingRules: boolean;
  multiLanguage: boolean;
}

/* -------------------------------------------------------------------------- */
/* ADAPTER CONTRACT                                                           */
/* -------------------------------------------------------------------------- */

export interface SearchAdapter {
  /** Identifiant humain stable (logs, monitoring) */
  readonly name: string;

  /** Nom canonique du moteur */
  readonly engine: SearchEngineName;

  /** Capacités déclarées */
  readonly capabilities: AdapterCapabilities;

  /* ---------------------------------------------------------------------- */
  /* LIFECYCLE                                                               */
  /* ---------------------------------------------------------------------- */

  /**
   * Initialisation optionnelle (connexion, warmup, preload).
   * Doit être idempotente.
   */
  initialize?(): Promise<void>;

  /**
   * Libération propre des ressources.
   * Doit être tolérante aux erreurs.
   */
  shutdown?(): Promise<void>;

  /* ---------------------------------------------------------------------- */
  /* SEARCH                                                                  */
  /* ---------------------------------------------------------------------- */

  /**
   * Exécute une requête de recherche brute.
   * ⚠️ Doit être idempotent, timeout-safe et déterministe.
   */
  search(
    query: SearchQueryInput
  ): Promise<SearchRawResult>;

  /* ---------------------------------------------------------------------- */
  /* INDEX MANAGEMENT                                                        */
  /* ---------------------------------------------------------------------- */

  /**
   * Création d'un index logique.
   */
  createIndex(
    descriptor: SearchIndexDefinition
  ): Promise<void>;

  /**
   * Suppression d'un index.
   */
  deleteIndex(indexName: string): Promise<void>;

  /**
   * Réindexation complète.
   */
  reindex(indexName: string): Promise<void>;

  /**
   * Push d'un document dans l'index.
   */
  indexDocument(
    indexName: string,
    document: Record<string, unknown>
  ): Promise<void>;

  /**
   * Suppression d'un document.
   */
  deleteDocument(
    indexName: string,
    documentId: string
  ): Promise<void>;

  /* ---------------------------------------------------------------------- */
  /* HEALTH & DIAGNOSTICS                                                     */
  /* ---------------------------------------------------------------------- */

  /**
   * Ping du moteur.
   */
  healthCheck(): Promise<AdapterHealth>;
}
