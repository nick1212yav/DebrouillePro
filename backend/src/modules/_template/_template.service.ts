/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE — MODULE TEMPLATE SERVICE (OFFICIAL & FINAL)                   */
/* -------------------------------------------------------------------------- */
/*  Chemin : backend/src/modules/_template/_template.service.ts               */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE ABSOLU                                                               */
/*  - CŒUR MÉTIER PUR DU MODULE                                               */
/*  - AUCUNE notion HTTP                                                     */
/*  - AUCUNE logique d’accès ici                                              */
/*  - AUCUNE dépendance provider externe                                      */
/*                                                                            */
/*  CE FICHIER EST LE MODÈLE DE TOUS LES SERVICES MÉTIERS                      */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { TemplateModel, TemplateDocument } from "./_template.model";
import {
  CreateTemplateDTO,
  UpdateTemplateDTO,
  TemplateEntity,
  TemplateResult,
} from "./_template.types";

/* -------------------------------------------------------------------------- */
/* SERVICE — CLASSE FINALE                                                    */
/* -------------------------------------------------------------------------- */

export class TemplateService {
  /* ------------------------------------------------------------------------ */
  /* CREATE                                                                   */
  /* ------------------------------------------------------------------------ */

  static async create(
    ownerId: string,
    ownerType: "PERSON" | "ORGANIZATION",
    payload: CreateTemplateDTO
  ): Promise<TemplateResult<TemplateEntity>> {
    const doc = await TemplateModel.create({
      ownerId,
      ownerType,
      title: payload.title,
      description: payload.description,
      metadata: payload.metadata || {},
      status: "DRAFT",
    });

    return {
      success: true,
      data: this.toEntity(doc),
    };
  }

  /* ------------------------------------------------------------------------ */
  /* READ                                                                     */
  /* ------------------------------------------------------------------------ */

  static async getById(
    id: string
  ): Promise<TemplateResult<TemplateEntity>> {
    const doc = await TemplateModel.findById(id);

    if (!doc) {
      return {
        success: false,
        error: "Entity not found",
      };
    }

    return {
      success: true,
      data: this.toEntity(doc),
    };
  }

  /* ------------------------------------------------------------------------ */
  /* UPDATE                                                                   */
  /* ------------------------------------------------------------------------ */

  static async update(
    id: string,
    payload: UpdateTemplateDTO
  ): Promise<TemplateResult<TemplateEntity>> {
    const doc = await TemplateModel.findByIdAndUpdate(
      id,
      { $set: payload },
      { new: true }
    );

    if (!doc) {
      return {
        success: false,
        error: "Entity not found",
      };
    }

    return {
      success: true,
      data: this.toEntity(doc),
    };
  }

  /* ------------------------------------------------------------------------ */
  /* DELETE / ARCHIVE                                                         */
  /* ------------------------------------------------------------------------ */

  static async archive(
    id: string
  ): Promise<TemplateResult<void>> {
    const res = await TemplateModel.findByIdAndUpdate(
      id,
      { status: "ARCHIVED" },
      { new: true }
    );

    if (!res) {
      return {
        success: false,
        error: "Entity not found",
      };
    }

    return { success: true };
  }

  /* ------------------------------------------------------------------------ */
  /* LIST (BASIQUE, EXTENSIBLE)                                               */
  /* ------------------------------------------------------------------------ */

  static async listByOwner(
    ownerId: string
  ): Promise<TemplateResult<TemplateEntity[]>> {
    const docs = await TemplateModel.find({ ownerId })
      .sort({ createdAt: -1 })
      .limit(50);

    return {
      success: true,
      data: docs.map(this.toEntity),
    };
  }

  /* ------------------------------------------------------------------------ */
  /* MAPPING INTERNE                                                          */
  /* ------------------------------------------------------------------------ */

  private static toEntity(
    doc: TemplateDocument
  ): TemplateEntity {
    return {
      id: doc.id,
      ownerId: doc.ownerId,
      ownerType: doc.ownerType,
      title: doc.title,
      description: doc.description,
      status: doc.status,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
