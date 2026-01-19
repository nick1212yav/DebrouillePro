/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE — MODULE TEMPLATE CONTROLLER (OFFICIAL & FINAL)                */
/* -------------------------------------------------------------------------- */
/*  Chemin : backend/src/modules/_template/_template.controller.ts            */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE STRATÉGIQUE                                                          */
/*  - SEULE couche HTTP du module                                             */
/*  - Traduction Request → Domaine → Response                                 */
/*  - AUCUNE logique métier                                                   */
/*  - AUCUNE règle d’accès directe                                            */
/*                                                                            */
/*  CE FICHIER EST LE STANDARD ABSOLU                                         */
/*  DE TOUS LES CONTROLLERS DÉBROUILLE                                       */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Request, Response } from "express";

/* -------------------------------------------------------------------------- */
/* IMPORTS MODULE                                                             */
/* -------------------------------------------------------------------------- */

import { TemplateService } from "./_template.service";
import { TemplatePolicy } from "./_template.policy";
import {
  CreateTemplateDTO,
  UpdateTemplateDTO,
  TemplateAccessContext,
} from "./_template.types";
import { TemplateEvents } from "./_template.events";

/* -------------------------------------------------------------------------- */
/* IMPORTS CORE                                                               */
/* -------------------------------------------------------------------------- */

import { httpResponse } from "../../shared/httpResponse";

/* -------------------------------------------------------------------------- */
/* CONTROLLER — CLASSE FINALE                                                 */
/* -------------------------------------------------------------------------- */

export class TemplateController {
  /* ------------------------------------------------------------------------ */
  /* CREATE                                                                   */
  /* ------------------------------------------------------------------------ */

  static async create(req: Request, res: Response) {
    const context: TemplateAccessContext = {
      actorId: req.context.actorId,
      accountType: req.context.accountType,
      role: req.context.role,
      trustScore: req.context.trustScore,
      module: "_template",
      action: "CREATE",
    };

    const decision = await TemplatePolicy.evaluate(context);

    if (decision.decision !== "ALLOW") {
      return httpResponse.forbidden(res, decision);
    }

    const payload: CreateTemplateDTO = req.body;

    const result = await TemplateService.create(
      req.context.actorId,
      req.context.accountType,
      payload
    );

    if (!result.success) {
      return httpResponse.badRequest(res, result.error);
    }

    await TemplateEvents.dispatch({
      type: "TEMPLATE_CREATED",
      entityId: result.data!.id,
      actorId: req.context.actorId,
      occurredAt: new Date(),
    });

    return httpResponse.created(res, result.data);
  }

  /* ------------------------------------------------------------------------ */
  /* READ                                                                     */
  /* ------------------------------------------------------------------------ */

  static async getById(req: Request, res: Response) {
    const context: TemplateAccessContext = {
      actorId: req.context.actorId,
      accountType: req.context.accountType,
      role: req.context.role,
      trustScore: req.context.trustScore,
      module: "_template",
      action: "READ",
    };

    const decision = await TemplatePolicy.evaluate(context);

    if (decision.decision !== "ALLOW") {
      return httpResponse.forbidden(res, decision);
    }

    const result = await TemplateService.getById(req.params.id);

    if (!result.success) {
      return httpResponse.notFound(res, result.error);
    }

    return httpResponse.ok(res, result.data);
  }

  /* ------------------------------------------------------------------------ */
  /* UPDATE                                                                   */
  /* ------------------------------------------------------------------------ */

  static async update(req: Request, res: Response) {
    const context: TemplateAccessContext = {
      actorId: req.context.actorId,
      accountType: req.context.accountType,
      role: req.context.role,
      trustScore: req.context.trustScore,
      module: "_template",
      action: "UPDATE",
    };

    const decision = await TemplatePolicy.evaluate(context);

    if (decision.decision !== "ALLOW") {
      return httpResponse.forbidden(res, decision);
    }

    const payload: UpdateTemplateDTO = req.body;

    const result = await TemplateService.update(req.params.id, payload);

    if (!result.success) {
      return httpResponse.notFound(res, result.error);
    }

    await TemplateEvents.dispatch({
      type: "TEMPLATE_UPDATED",
      entityId: req.params.id,
      actorId: req.context.actorId,
      occurredAt: new Date(),
    });

    return httpResponse.ok(res, result.data);
  }

  /* ------------------------------------------------------------------------ */
  /* ARCHIVE                                                                  */
  /* ------------------------------------------------------------------------ */

  static async archive(req: Request, res: Response) {
    const context: TemplateAccessContext = {
      actorId: req.context.actorId,
      accountType: req.context.accountType,
      role: req.context.role,
      trustScore: req.context.trustScore,
      module: "_template",
      action: "DELETE",
    };

    const decision = await TemplatePolicy.evaluate(context);

    if (decision.decision !== "ALLOW") {
      return httpResponse.forbidden(res, decision);
    }

    const result = await TemplateService.archive(req.params.id);

    if (!result.success) {
      return httpResponse.notFound(res, result.error);
    }

    await TemplateEvents.dispatch({
      type: "TEMPLATE_DELETED",
      entityId: req.params.id,
      actorId: req.context.actorId,
      occurredAt: new Date(),
    });

    return httpResponse.noContent(res);
  }

  /* ------------------------------------------------------------------------ */
  /* LIST                                                                     */
  /* ------------------------------------------------------------------------ */

  static async listMine(req: Request, res: Response) {
    const context: TemplateAccessContext = {
      actorId: req.context.actorId,
      accountType: req.context.accountType,
      role: req.context.role,
      trustScore: req.context.trustScore,
      module: "_template",
      action: "READ",
    };

    const decision = await TemplatePolicy.evaluate(context);

    if (decision.decision !== "ALLOW") {
      return httpResponse.forbidden(res, decision);
    }

    const result = await TemplateService.listByOwner(
      req.context.actorId
    );

    return httpResponse.ok(res, result.data);
  }
}
