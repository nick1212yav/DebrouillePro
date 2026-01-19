/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE NOTIFICATION — TEMPLATE TYPES (WORLD #1 CONTRACTS)             */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/notification/templates/template.types.ts           */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*  - Définir les contrats universels de génération de messages               */
/*  - Supporter multilingue, multicanal, IA, personnalisation dynamique       */
/*  - Garantir traçabilité, conformité et compatibilité future                */
/*                                                                            */
/*  ⚠️ Aucune logique métier ici                                               */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Types } from "mongoose";

/* -------------------------------------------------------------------------- */
/* TEMPLATE IDENTITY                                                          */
/* -------------------------------------------------------------------------- */

export type TemplateId = string;

/**
 * Version sémantique contrôlée.
 * Exemple: 1.0.0, 2.1.3
 */
export type TemplateVersion = string;

/**
 * Langue ISO étendue.
 * fr, fr-CD, en, en-US, sw, ln, etc.
 */
export type LocaleCode = string;

/**
 * Canal supporté par un template.
 */
export type TemplateChannel =
  | "push"
  | "sms"
  | "email"
  | "chat"
  | "ussd"
  | "offline";

/* -------------------------------------------------------------------------- */
/* TEMPLATE CATEGORY                                                          */
/* -------------------------------------------------------------------------- */

export enum TemplateCategory {
  SYSTEM = "SYSTEM",         // Sécurité, alertes critiques
  TRANSACTIONAL = "TRANSACTIONAL",
  MARKETING = "MARKETING",
  LEGAL = "LEGAL",
  EDUCATION = "EDUCATION",
  COMMUNITY = "COMMUNITY",
  EMERGENCY = "EMERGENCY",
}

/* -------------------------------------------------------------------------- */
/* TEMPLATE VARIABLES                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Variable injectée dynamiquement.
 */
export interface TemplateVariable {
  key: string;
  description?: string;

  /**
   * Typage faible volontairement pour IA & extensibilité.
   */
  type:
    | "string"
    | "number"
    | "boolean"
    | "date"
    | "currency"
    | "url"
    | "json";

  required?: boolean;

  /**
   * Valeur par défaut sécurisée.
   */
  defaultValue?: unknown;

  /**
   * Masquage automatique pour logs / audit.
   */
  sensitive?: boolean;
}

/* -------------------------------------------------------------------------- */
/* TEMPLATE CONTENT                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Contenu par canal.
 */
export interface TemplateChannelContent {
  channel: TemplateChannel;

  /**
   * Sujet (email, push, chat headline).
   */
  subject?: string;

  /**
   * Corps principal (markdown / html / text / ssml).
   */
  body: string;

  /**
   * Fallback si canal indisponible.
   */
  fallbackChannel?: TemplateChannel;

  /**
   * Poids estimé (optimisation IA routing).
   */
  estimatedSize?: number;
}

/**
 * Localisation complète.
 */
export interface TemplateLocaleContent {
  locale: LocaleCode;
  channels: TemplateChannelContent[];
}

/* -------------------------------------------------------------------------- */
/* TEMPLATE METADATA                                                          */
/* -------------------------------------------------------------------------- */

export interface TemplateCompliance {
  gdpr?: boolean;
  optInRequired?: boolean;
  retentionDays?: number;
  legalNoticeRequired?: boolean;
}

export interface TemplateQualitySignals {
  readabilityScore?: number;
  toxicityScore?: number;
  spamScore?: number;
  sentimentScore?: number;
}

/* -------------------------------------------------------------------------- */
/* TEMPLATE CONTRACT                                                          */
/* -------------------------------------------------------------------------- */

export interface TemplateContract {
  _id?: Types.ObjectId;

  templateId: TemplateId;
  version: TemplateVersion;

  name: string;
  description?: string;

  category: TemplateCategory;

  locales: TemplateLocaleContent[];

  variables: TemplateVariable[];

  compliance?: TemplateCompliance;

  qualitySignals?: TemplateQualitySignals;

  tags?: string[];

  active: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

/* -------------------------------------------------------------------------- */
/* RENDER REQUEST                                                             */
/* -------------------------------------------------------------------------- */

export interface TemplateRenderRequest {
  templateId: TemplateId;
  version?: TemplateVersion;
  locale: LocaleCode;
  channel: TemplateChannel;

  variables: Record<string, unknown>;
}

/* -------------------------------------------------------------------------- */
/* RENDER RESULT                                                              */
/* -------------------------------------------------------------------------- */

export interface TemplateRenderResult {
  templateId: TemplateId;
  version: TemplateVersion;
  locale: LocaleCode;
  channel: TemplateChannel;

  subject?: string;
  body: string;

  /**
   * Variables réellement utilisées (audit).
   */
  resolvedVariables: Record<string, unknown>;

  /**
   * Indique si fallback utilisé.
   */
  usedFallback?: boolean;
}

/* -------------------------------------------------------------------------- */
/* INVARIANTS                                                                 */
/* -------------------------------------------------------------------------- */

export const TEMPLATE_INVARIANTS = {
  TEMPLATE_IS_IMMUTABLE_ONCE_PUBLISHED: true,
  VARIABLES_ARE_SANITIZED: true,
  RENDERING_IS_DETERMINISTIC: true,
  COMPLIANCE_IS_ENFORCED: true,
} as const;
