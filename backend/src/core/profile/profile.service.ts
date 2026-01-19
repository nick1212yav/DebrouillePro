/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE PROFILE — PROFILE SERVICE (WORLD #1 CANONICAL)                 */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/profile/profile.service.ts                         */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE STRATÉGIQUE :                                                        */
/*   - Orchestrer le cycle de vie des profils                                 */
/*   - Garantir cohérence Identity ↔ Profile                                  */
/*   - Gouverner visibilité, recherche, stats, réputation                     */
/*   - Interface unique pour tous les modules                                 */
/*                                                                            */
/*  GARANTIES ABSOLUES :                                                      */
/*   - Aucun accès direct au modèle                                           */
/*   - Champs strictement contrôlés                                           */
/*   - Zéro suppression physique                                              */
/*   - Toutes les mutations sont auditables                                   */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Types } from "mongoose";

import {
  IdentityKind,
} from "../identity/identity.types";

import {
  ProfileModel,
  IProfile,
  ProfileVisibility,
  ProfileVerificationStatus,
  ProfileCategory,
} from "./profile.model";

/* ========================================================================== */
/* TYPES                                                                      */
/* ========================================================================== */

export type CreateProfileInput = {
  identityKind: IdentityKind;
  userId?: Types.ObjectId;
  organizationId?: Types.ObjectId;

  displayName: string;
  username?: string;
  avatarUrl?: string;
  category?: ProfileCategory;
};

export type UpdateProfileInput = Partial<
  Pick<
    IProfile,
    | "displayName"
    | "username"
    | "tagline"
    | "avatarUrl"
    | "coverUrl"
    | "bio"
    | "description"
    | "location"
    | "timezone"
    | "skills"
    | "interests"
    | "languages"
    | "socialLinks"
    | "visibility"
    | "settings"
  >
>;

export type ProfileViewerContext = {
  viewerIdentityKind?: IdentityKind;
  isOwner?: boolean;
  isNetworkMember?: boolean;
  isAdmin?: boolean;
};

/* ========================================================================== */
/* INTERNAL CONSTANTS                                                         */
/* ========================================================================== */

/**
 * Champs explicitement autorisés à la mise à jour publique.
 * Sécurité maximale : whitelist stricte.
 */
const ALLOWED_UPDATE_FIELDS: (keyof UpdateProfileInput)[] = [
  "displayName",
  "username",
  "tagline",
  "avatarUrl",
  "coverUrl",
  "bio",
  "description",
  "location",
  "timezone",
  "skills",
  "interests",
  "languages",
  "socialLinks",
  "visibility",
  "settings",
];

/**
 * Limites de protection anti-abus.
 */
const LIMITS = {
  MAX_SKILLS: 50,
  MAX_INTERESTS: 50,
  MAX_LANGUAGES: 20,
};

/* ========================================================================== */
/* INTERNAL GUARDS                                                            */
/* ========================================================================== */

const sanitizeArrays = (updates: UpdateProfileInput) => {
  if (updates.skills?.length && updates.skills.length > LIMITS.MAX_SKILLS) {
    updates.skills = updates.skills.slice(0, LIMITS.MAX_SKILLS);
  }

  if (
    updates.interests?.length &&
    updates.interests.length > LIMITS.MAX_INTERESTS
  ) {
    updates.interests = updates.interests.slice(
      0,
      LIMITS.MAX_INTERESTS
    );
  }

  if (
    updates.languages?.length &&
    updates.languages.length > LIMITS.MAX_LANGUAGES
  ) {
    updates.languages = updates.languages.slice(
      0,
      LIMITS.MAX_LANGUAGES
    );
  }
};

/**
 * Applique les règles de visibilité.
 */
const canViewProfile = (
  profile: IProfile,
  viewer?: ProfileViewerContext
): boolean => {
  if (viewer?.isOwner || viewer?.isAdmin) return true;

  switch (profile.visibility) {
    case ProfileVisibility.PUBLIC:
      return true;

    case ProfileVisibility.NETWORK:
      return Boolean(viewer?.isNetworkMember);

    case ProfileVisibility.PRIVATE:
      return false;

    default:
      return false;
  }
};

/* ========================================================================== */
/* PROFILE SERVICE                                                            */
/* ========================================================================== */

export class ProfileService {
  /* ======================================================================== */
  /* CREATION                                                                 */
  /* ======================================================================== */

  /**
   * Crée un profil pour une identité donnée.
   * Idempotent : ne crée jamais de doublon.
   */
  static async createProfile(
    input: CreateProfileInput
  ): Promise<IProfile> {
    const existing = await ProfileModel.findOne({
      identityKind: input.identityKind,
      userId: input.userId,
      organizationId: input.organizationId,
    });

    if (existing) return existing;

    const profile = new ProfileModel({
      identityKind: input.identityKind,
      userId: input.userId,
      organizationId: input.organizationId,
      displayName: input.displayName,
      username: input.username,
      avatarUrl: input.avatarUrl,
      category: input.category,
      visibility: ProfileVisibility.PUBLIC,
      verificationStatus:
        ProfileVerificationStatus.UNVERIFIED,
      stats: {
        followersCount: 0,
        followingCount: 0,
        viewsCount: 0,
        endorsementsCount: 0,
        interactionsCount: 0,
      },
      settings: {
        allowSearchIndexing: true,
        allowRecommendations: true,
        allowAnalyticsTracking: true,
        allowPublicStats: true,
      },
    });

    await profile.save();
    return profile;
  }

  /* ======================================================================== */
  /* READ                                                                      */
  /* ======================================================================== */

  /**
   * Récupérer un profil par ID avec contrôle de visibilité.
   */
  static async getProfileById(params: {
    profileId: Types.ObjectId;
    viewer?: ProfileViewerContext;
    incrementView?: boolean;
  }): Promise<IProfile | null> {
    const profile = await ProfileModel.findById(
      params.profileId
    );

    if (!profile) return null;

    if (!canViewProfile(profile, params.viewer)) {
      return null;
    }

    if (params.incrementView) {
      await ProfileModel.updateOne(
        { _id: profile._id },
        {
          $inc: { "stats.viewsCount": 1 },
          $set: { lastViewedAt: new Date() },
        }
      ).exec();
    }

    return profile;
  }

  /**
   * Récupérer un profil public par username.
   */
  static async getPublicProfileByUsername(
    username: string
  ): Promise<IProfile | null> {
    return ProfileModel.findOne({
      username: username.toLowerCase(),
      visibility: ProfileVisibility.PUBLIC,
    }).exec();
  }

  /* ======================================================================== */
  /* UPDATE                                                                    */
  /* ======================================================================== */

  /**
   * Met à jour un profil avec whitelist stricte.
   */
  static async updateProfile(params: {
    profileId: Types.ObjectId;
    updates: UpdateProfileInput;
    updatedBy?: Types.ObjectId;
  }): Promise<IProfile> {
    const safeUpdates: Partial<IProfile> = {};

    sanitizeArrays(params.updates);

    for (const key of ALLOWED_UPDATE_FIELDS) {
      if (key in params.updates) {
        // @ts-ignore – clé validée par whitelist
        safeUpdates[key] = params.updates[key];
      }
    }

    safeUpdates.lastUpdatedBy = params.updatedBy;

    const updated = await ProfileModel.findByIdAndUpdate(
      params.profileId,
      { $set: safeUpdates },
      { new: true }
    );

    if (!updated) {
      throw new Error("Profile not found");
    }

    return updated;
  }

  /* ======================================================================== */
  /* VISIBILITY                                                                */
  /* ======================================================================== */

  /**
   * Modifier uniquement la visibilité.
   */
  static async setVisibility(params: {
    profileId: Types.ObjectId;
    visibility: ProfileVisibility;
    updatedBy?: Types.ObjectId;
  }): Promise<IProfile> {
    const updated = await ProfileModel.findByIdAndUpdate(
      params.profileId,
      {
        $set: {
          visibility: params.visibility,
          lastUpdatedBy: params.updatedBy,
        },
      },
      { new: true }
    );

    if (!updated) {
      throw new Error("Profile not found");
    }

    return updated;
  }

  /* ======================================================================== */
  /* VERIFICATION                                                             */
  /* ======================================================================== */

  /**
   * Mettre à jour le statut de vérification (admin / institution).
   */
  static async setVerificationStatus(params: {
    profileId: Types.ObjectId;
    status: ProfileVerificationStatus;
    updatedBy: Types.ObjectId;
  }): Promise<IProfile> {
    const updated = await ProfileModel.findByIdAndUpdate(
      params.profileId,
      {
        $set: {
          verificationStatus: params.status,
          "badges.verified":
            params.status ===
            ProfileVerificationStatus.VERIFIED,
          lastUpdatedBy: params.updatedBy,
        },
      },
      { new: true }
    );

    if (!updated) {
      throw new Error("Profile not found");
    }

    return updated;
  }

  /* ======================================================================== */
  /* TRUST SNAPSHOT                                                           */
  /* ======================================================================== */

  /**
   * Synchronise le snapshot de confiance depuis TrustEngine.
   */
  static async updateTrustSnapshot(params: {
    profileId: Types.ObjectId;
    trustScore: number;
    reputationScore?: number;
  }): Promise<void> {
    await ProfileModel.updateOne(
      { _id: params.profileId },
      {
        $set: {
          trustScoreSnapshot: params.trustScore,
          reputationScore: params.reputationScore,
        },
      }
    ).exec();
  }

  /* ======================================================================== */
  /* STATS                                                                     */
  /* ======================================================================== */

  /**
   * Incrément générique de statistiques.
   */
  static async incrementStat(params: {
    profileId: Types.ObjectId;
    field:
      | "followersCount"
      | "followingCount"
      | "viewsCount"
      | "endorsementsCount"
      | "interactionsCount";
    value?: number;
  }): Promise<void> {
    const incValue = params.value ?? 1;

    await ProfileModel.updateOne(
      { _id: params.profileId },
      {
        $inc: {
          [`stats.${params.field}`]: incValue,
        },
      }
    ).exec();
  }

  /* ======================================================================== */
  /* SEARCH & DISCOVERY                                                       */
  /* ======================================================================== */

  /**
   * Recherche textuelle avancée de profils publics.
   */
  static async searchPublicProfiles(params: {
    query: string;
    limit?: number;
    minTrustScore?: number;
    verifiedOnly?: boolean;
  }): Promise<IProfile[]> {
    const queryFilter: any = {
      $text: { $search: params.query },
      visibility: ProfileVisibility.PUBLIC,
    };

    if (params.minTrustScore !== undefined) {
      queryFilter.trustScoreSnapshot = {
        $gte: params.minTrustScore,
      };
    }

    if (params.verifiedOnly) {
      queryFilter.verificationStatus =
        ProfileVerificationStatus.VERIFIED;
    }

    return ProfileModel.find(
      queryFilter,
      { score: { $meta: "textScore" } }
    )
      .sort({
        score: { $meta: "textScore" },
        trustScoreSnapshot: -1,
      })
      .limit(params.limit || 25)
      .exec();
  }

  /**
   * Découverte intelligente (base IA / ranking).
   */
  static async discoverProfiles(params: {
    limit?: number;
    category?: ProfileCategory;
  }): Promise<IProfile[]> {
    const filter: any = {
      visibility: ProfileVisibility.PUBLIC,
    };

    if (params.category) {
      filter.category = params.category;
    }

    return ProfileModel.find(filter)
      .sort({
        reputationScore: -1,
        trustScoreSnapshot: -1,
        "stats.followersCount": -1,
      })
      .limit(params.limit || 20)
      .exec();
  }
}
