/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE DOC — DOCUMENT TYPES & CONTRACTS (WORLD #1 FINAL)              */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/doc/document.types.ts                              */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Définir les contrats API stables du module Document                     */
/*   - Isoler les DTOs du modèle Mongo                                         */
/*   - Garantir compatibilité frontend / mobile / partenaires / IA            */
/*                                                                            */
/*  GARANTIES :                                                               */
/*   - Aucun champ sensible exposé                                             */
/*   - Versionnable sans rupture                                              */
/*   - Lisible par humains, machines, IA                                       */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Types } from "mongoose";
import { IdentityKind } from "../identity/identity.types";
import {
  DocumentType,
  DocumentStatus,
  DocumentVisibility,
} from "./document.model";

/* -------------------------------------------------------------------------- */
/* CORE IDENTIFIERS                                                           */
/* -------------------------------------------------------------------------- */

export type DocumentId = string;

/**
 * Référence légère d’un document.
 * Utilisée dans d’autres modules (pay, justice, audit, IA).
 */
export interface DocumentRef {
  id: DocumentId;
  type: DocumentType;
  title: string;
  status: DocumentStatus;
}

/* -------------------------------------------------------------------------- */
/* PUBLIC DOCUMENT VIEW (SAFE DTO)                                            */
/* -------------------------------------------------------------------------- */

/**
 * Vue publique / API d’un document.
 * ⚠️ Ne jamais exposer d’informations sensibles internes.
 */
export interface DocumentDTO {
  id: DocumentId;

  identityKind: IdentityKind;

  owner: {
    userId?: string;
    organizationId?: string;
  };

  classification: {
    type: DocumentType;
    title: string;
    description?: string;
  };

  file: {
    url: string;
    mimeType?: string;
    size?: number;
    hash?: string;
  };

  lifecycle: {
    status: DocumentStatus;
    visibility: DocumentVisibility;
    issuedAt?: string;
    expiresAt?: string;
  };

  verification?: {
    verifiedBy?: string;
    verifiedAt?: string;
    notes?: string;
  };

  relations?: {
    relatedModule?: string;
    relatedEntityId?: string;
  };

  metadata?: Record<string, unknown>;

  audit: {
    createdAt: string;
    updatedAt: string;
  };
}

/* -------------------------------------------------------------------------- */
/* CREATE / UPDATE INPUTS                                                     */
/* -------------------------------------------------------------------------- */

export interface CreateDocumentInput {
  identityKind: IdentityKind;

  userId?: string;
  organizationId?: string;

  type: DocumentType;
  title: string;
  description?: string;

  fileUrl: string;
  fileHash?: string;
  fileMimeType?: string;
  fileSize?: number;

  visibility?: DocumentVisibility;

  issuedAt?: string;
  expiresAt?: string;

  relatedModule?: string;
  relatedEntityId?: string;

  metadata?: Record<string, unknown>;
}

export interface UpdateDocumentInput {
  title?: string;
  description?: string;
  visibility?: DocumentVisibility;

  issuedAt?: string;
  expiresAt?: string;

  metadata?: Record<string, unknown>;
}

/* -------------------------------------------------------------------------- */
/* VERIFICATION / LIFECYCLE COMMANDS                                          */
/* -------------------------------------------------------------------------- */

export interface VerifyDocumentCommand {
  documentId: DocumentId;
  verifiedBy: string;
  notes?: string;
}

export interface RejectDocumentCommand {
  documentId: DocumentId;
  reason: string;
}

export interface ArchiveDocumentCommand {
  documentId: DocumentId;
}

/* -------------------------------------------------------------------------- */
/* QUERY FILTERS                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Filtres de recherche avancés.
 */
export interface DocumentQueryFilter {
  identityKind?: IdentityKind;
  userId?: string;
  organizationId?: string;

  type?: DocumentType;
  status?: DocumentStatus | DocumentStatus[];
  visibility?: DocumentVisibility;

  relatedModule?: string;

  issuedAfter?: string;
  issuedBefore?: string;

  expiresAfter?: string;
  expiresBefore?: string;

  text?: string; // recherche plein texte

  limit?: number;
  offset?: number;
  sortBy?: "createdAt" | "updatedAt" | "expiresAt";
  sortOrder?: "asc" | "desc";
}

/* -------------------------------------------------------------------------- */
/* PAGINATED RESULT                                                           */
/* -------------------------------------------------------------------------- */

export interface DocumentListResult {
  items: DocumentDTO[];
  total: number;
  limit: number;
  offset: number;
}

/* -------------------------------------------------------------------------- */
/* PERMISSIONS                                                                */
/* -------------------------------------------------------------------------- */

export enum DocumentPermission {
  CREATE = "DOCUMENT_CREATE",
  READ = "DOCUMENT_READ",
  UPDATE = "DOCUMENT_UPDATE",
  VERIFY = "DOCUMENT_VERIFY",
  ARCHIVE = "DOCUMENT_ARCHIVE",
  SHARE = "DOCUMENT_SHARE",
}

/* -------------------------------------------------------------------------- */
/* DOMAIN EVENTS (AUDIT / STREAMING / IA)                                     */
/* -------------------------------------------------------------------------- */

export enum DocumentEventType {
  CREATED = "DOCUMENT_CREATED",
  UPDATED = "DOCUMENT_UPDATED",
  SUBMITTED = "DOCUMENT_SUBMITTED",
  VERIFIED = "DOCUMENT_VERIFIED",
  REJECTED = "DOCUMENT_REJECTED",
  ARCHIVED = "DOCUMENT_ARCHIVED",
  EXPIRED = "DOCUMENT_EXPIRED",
  ACCESSED = "DOCUMENT_ACCESSED",
}

/**
 * Événement métier document.
 * Peut être envoyé vers :
 * - Audit
 * - Event bus
 * - IA
 * - Data lake
 */
export interface DocumentEvent {
  type: DocumentEventType;

  document: DocumentRef;

  actor: {
    identityKind: IdentityKind;
    userId?: string;
    organizationId?: string;
  };

  payload?: Record<string, unknown>;

  occurredAt: string;
}

/* -------------------------------------------------------------------------- */
/* MAPPERS (BOUNDARY HELPERS)                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Mapper ObjectId → string.
 */
export const toId = (
  value?: Types.ObjectId | string
): string | undefined => {
  if (!value) return undefined;
  return typeof value === "string"
    ? value
    : value.toHexString();
};

/* -------------------------------------------------------------------------- */
/* INVARIANTS                                                                 */
/* -------------------------------------------------------------------------- */

export const DOCUMENT_INVARIANTS = {
  DOCUMENTS_ARE_IMMUTABLE_FILES: true,
  PHYSICAL_DELETION_IS_FORBIDDEN: true,
  ALL_CHANGES_ARE_AUDITABLE: true,
  DTO_NEVER_EXPOSE_INTERNAL_IDS: true,
  EVENTS_ARE_APPEND_ONLY: true,
} as const;
