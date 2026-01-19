/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE PROFILE — PROFILE CONTROLLER (WORLD #1 CANONICAL)              */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/profile/profile.controller.ts                      */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE STRATÉGIQUE :                                                        */
/*   - Exposer une API propre, stable et sécurisée                             */
/*   - Traduire HTTP → Domain → HTTP                                           */
/*   - Garantir validation, audit, observabilité                               */
/*                                                                            */
/*  INTERDICTIONS :                                                           */
/*   - Aucune logique métier ici                                               */
/*   - Aucun accès direct au modèle                                            */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Request, Response } from "express";
import { Types } from "mongoose";

import { ProfileService } from "./profile.service";
import {
  ProfileVisibility,
  ProfileVerificationStatus,
  ProfileCategory,
} from "./profile.model";

import { ok, error as httpError } from "../../shared/httpResponse";
import { logger } from "../../shared/logger";

/* ========================================================================== */
/* HELPERS                                                                    */
/* ========================================================================== */

const parseObjectId = (value?: string): Types.ObjectId | null => {
  if (!value) return null;
  return Types.ObjectId.isValid(value)
    ? new Types.ObjectId(value)
    : null;
};

const parseNumber = (
  value: any,
  defaultValue?: number
): number | undefined => {
  const n = Number(value);
  return Number.isFinite(n) ? n : defaultValue;
};

/* ========================================================================== */
/* CONTROLLER                                                                 */
/* ========================================================================== */

export class ProfileController {
  /* ======================================================================== */
  /* CREATE                                                                   */
  /* ======================================================================== */

  /**
   * POST /profiles
   */
  static async createProfile(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      if (!req.identity) {
        return httpError(res, {
          statusCode: 401,
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      const profile =
        await ProfileService.createProfile({
          identityKind:
            req.identity.identity.kind,
          userId:
            req.identity.identity.kind === "PERSON"
              ? req.identity.identity.userId
              : undefined,
          organizationId:
            req.identity.identity.kind ===
            "ORGANIZATION"
              ? req.identity.identity.organizationId
              : undefined,
          displayName: req.body.displayName,
          username: req.body.username,
          avatarUrl: req.body.avatarUrl,
          category: req.body.category,
        });

      logger.info("PROFILE_CREATED", {
        profileId: profile._id,
        actor: req.identity.identity,
      });

      return ok(res, {
        message: "Profile created",
        data: profile,
      });
    } catch (err: any) {
      logger.error("PROFILE_CREATE_FAILED", {
        reason: err?.message,
      });

      return httpError(res, {
        statusCode: 400,
        code: "PROFILE_CREATE_FAILED",
        message: err?.message ?? "Unable to create profile",
      });
    }
  }

  /* ======================================================================== */
  /* READ                                                                      */
  /* ======================================================================== */

  /**
   * GET /profiles/:id
   */
  static async getProfileById(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const profileId = parseObjectId(req.params.id);
      if (!profileId) {
        return httpError(res, {
          statusCode: 400,
          code: "INVALID_PROFILE_ID",
          message: "Invalid profile id",
        });
      }

      const profile =
        await ProfileService.getProfileById({
          profileId,
          viewer: {
            isOwner:
              req.identity?.identity.kind !== "GUEST",
            isNetworkMember: false, // branch future network
            isAdmin: false,
          },
          incrementView: true,
        });

      if (!profile) {
        return httpError(res, {
          statusCode: 404,
          code: "PROFILE_NOT_FOUND",
          message: "Profile not found or inaccessible",
        });
      }

      return ok(res, {
        data: profile,
      });
    } catch (err: any) {
      logger.error("PROFILE_GET_FAILED", {
        reason: err?.message,
      });

      return httpError(res, {
        statusCode: 500,
        code: "PROFILE_GET_FAILED",
        message: "Unable to retrieve profile",
      });
    }
  }

  /**
   * GET /profiles/username/:username
   */
  static async getProfileByUsername(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const username = String(req.params.username || "").trim();
      if (!username) {
        return httpError(res, {
          statusCode: 400,
          code: "INVALID_USERNAME",
          message: "Username is required",
        });
      }

      const profile =
        await ProfileService.getPublicProfileByUsername(
          username
        );

      if (!profile) {
        return httpError(res, {
          statusCode: 404,
          code: "PROFILE_NOT_FOUND",
          message: "Profile not found",
        });
      }

      return ok(res, {
        data: profile,
      });
    } catch (err: any) {
      logger.error("PROFILE_GET_BY_USERNAME_FAILED", {
        reason: err?.message,
      });

      return httpError(res, {
        statusCode: 500,
        code: "PROFILE_GET_FAILED",
        message: "Unable to retrieve profile",
      });
    }
  }

  /* ======================================================================== */
  /* UPDATE                                                                    */
  /* ======================================================================== */

  /**
   * PATCH /profiles/:id
   */
  static async updateProfile(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      if (!req.identity) {
        return httpError(res, {
          statusCode: 401,
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      const profileId = parseObjectId(req.params.id);
      if (!profileId) {
        return httpError(res, {
          statusCode: 400,
          code: "INVALID_PROFILE_ID",
          message: "Invalid profile id",
        });
      }

      const updated =
        await ProfileService.updateProfile({
          profileId,
          updates: req.body,
          updatedBy:
            req.identity.identity.kind === "PERSON"
              ? req.identity.identity.userId
              : undefined,
        });

      logger.info("PROFILE_UPDATED", {
        profileId,
        actor: req.identity.identity,
      });

      return ok(res, {
        message: "Profile updated",
        data: updated,
      });
    } catch (err: any) {
      logger.error("PROFILE_UPDATE_FAILED", {
        reason: err?.message,
      });

      return httpError(res, {
        statusCode: 400,
        code: "PROFILE_UPDATE_FAILED",
        message: err?.message ?? "Unable to update profile",
      });
    }
  }

  /* ======================================================================== */
  /* VISIBILITY                                                                */
  /* ======================================================================== */

  /**
   * PATCH /profiles/:id/visibility
   */
  static async updateVisibility(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      if (!req.identity) {
        return httpError(res, {
          statusCode: 401,
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      const profileId = parseObjectId(req.params.id);
      if (!profileId) {
        return httpError(res, {
          statusCode: 400,
          code: "INVALID_PROFILE_ID",
          message: "Invalid profile id",
        });
      }

      if (
        !Object.values(ProfileVisibility).includes(
          req.body.visibility
        )
      ) {
        return httpError(res, {
          statusCode: 400,
          code: "INVALID_VISIBILITY",
          message: "Invalid visibility value",
        });
      }

      const updated =
        await ProfileService.setVisibility({
          profileId,
          visibility: req.body.visibility,
          updatedBy:
            req.identity.identity.kind === "PERSON"
              ? req.identity.identity.userId
              : undefined,
        });

      logger.info("PROFILE_VISIBILITY_UPDATED", {
        profileId,
        visibility: req.body.visibility,
      });

      return ok(res, {
        message: "Visibility updated",
        data: updated,
      });
    } catch (err: any) {
      logger.error("PROFILE_VISIBILITY_FAILED", {
        reason: err?.message,
      });

      return httpError(res, {
        statusCode: 400,
        code: "PROFILE_VISIBILITY_FAILED",
        message: err?.message,
      });
    }
  }

  /* ======================================================================== */
  /* SEARCH                                                                    */
  /* ======================================================================== */

  /**
   * GET /profiles/search?q=...
   */
  static async searchProfiles(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const query = String(req.query.q || "").trim();
      if (!query) {
        return httpError(res, {
          statusCode: 400,
          code: "QUERY_REQUIRED",
          message: "Search query is required",
        });
      }

      const limit = parseNumber(req.query.limit, 25);
      const minTrust = parseNumber(req.query.minTrust);
      const verifiedOnly =
        req.query.verified === "true";

      const results =
        await ProfileService.searchPublicProfiles({
          query,
          limit,
          minTrustScore: minTrust,
          verifiedOnly,
        });

      return ok(res, {
        data: results,
      });
    } catch (err: any) {
      logger.error("PROFILE_SEARCH_FAILED", {
        reason: err?.message,
      });

      return httpError(res, {
        statusCode: 500,
        code: "PROFILE_SEARCH_FAILED",
        message: "Unable to search profiles",
      });
    }
  }

  /* ======================================================================== */
  /* DISCOVERY                                                                 */
  /* ======================================================================== */

  /**
   * GET /profiles/discover
   */
  static async discoverProfiles(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const limit = parseNumber(req.query.limit, 20);
      const category = req.query
        .category as ProfileCategory | undefined;

      const results =
        await ProfileService.discoverProfiles({
          limit,
          category,
        });

      return ok(res, {
        data: results,
      });
    } catch (err: any) {
      logger.error("PROFILE_DISCOVER_FAILED", {
        reason: err?.message,
      });

      return httpError(res, {
        statusCode: 500,
        code: "PROFILE_DISCOVER_FAILED",
        message: "Unable to discover profiles",
      });
    }
  }
}
