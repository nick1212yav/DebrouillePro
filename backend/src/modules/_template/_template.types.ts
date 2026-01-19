/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE — MODULE TEMPLATE TYPES (OFFICIAL & FINAL)                     */
/* -------------------------------------------------------------------------- */
/*  Chemin : backend/src/modules/_template/_template.types.ts                 */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  CE FICHIER EST LA RÉFÉRENCE ABSOLUE                                       */
/*  - Tous les modules métiers copieront cette structure                      */
/*  - Stable, extensible, compatible Core (Access, Trust, Pay, AI)           */
/*  - Aucun import métier ici                                                 */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* MODULE IDENTITY                                                            */
/* -------------------------------------------------------------------------- */

export const TEMPLATE_MODULE_NAME = "_template";

/* -------------------------------------------------------------------------- */
/* ACTIONS STANDARDISÉES                                                      */
/* -------------------------------------------------------------------------- */

export type TemplateAction =
  | "CREATE"
  | "READ"
  | "UPDATE"
  | "DELETE"
  | "PUBLISH"
  | "ARCHIVE";

/* -------------------------------------------------------------------------- */
/* CONTEXTE D’ACCÈS                                                           */
/* -------------------------------------------------------------------------- */

export interface TemplateAccessContext {
  actorId: string;
  accountType: "PERSON" | "ORGANIZATION";
  role?: "ADMIN" | "STAFF" | "MEMBER";
  trustScore?: number;

  module: typeof TEMPLATE_MODULE_NAME;
  action: TemplateAction;
}

/* -------------------------------------------------------------------------- */
/* DTO — INPUT                                                                */
/* -------------------------------------------------------------------------- */

export interface CreateTemplateDTO {
  title: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface UpdateTemplateDTO {
  title?: string;
  description?: string;
  metadata?: Record<string, any>;
  status?: TemplateStatus;
}

/* -------------------------------------------------------------------------- */
/* ENTITÉ MÉTIER                                                              */
/* -------------------------------------------------------------------------- */

export type TemplateStatus =
  | "DRAFT"
  | "ACTIVE"
  | "SUSPENDED"
  | "ARCHIVED";

export interface TemplateEntity {
  id: string;

  ownerId: string;
  ownerType: "PERSON" | "ORGANIZATION";

  title: string;
  description?: string;

  status: TemplateStatus;

  createdAt: Date;
  updatedAt: Date;
}

/* -------------------------------------------------------------------------- */
/* RÉSULTATS STANDARD                                                         */
/* -------------------------------------------------------------------------- */

export interface TemplateResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/* -------------------------------------------------------------------------- */
/* ÉVÉNEMENTS MÉTIER                                                          */
/* -------------------------------------------------------------------------- */

export type TemplateEventType =
  | "TEMPLATE_CREATED"
  | "TEMPLATE_UPDATED"
  | "TEMPLATE_DELETED"
  | "TEMPLATE_PUBLISHED";

export interface TemplateEventPayload {
  type: TemplateEventType;
  entityId: string;
  actorId: string;
  occurredAt: Date;
  metadata?: Record<string, any>;
}
