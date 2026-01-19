/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE IDENTITY — ORGANIZATION SERVICE (WORLD #1 GOVERNANCE ENGINE)   */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/identity/organization.service.ts                   */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE CONSTITUTIONNEL :                                                    */
/*   - Gouverner toute entité collective                                      */
/*   - Garantir la traçabilité humaine                                        */
/*   - Sécuriser la propriété légale                                          */
/*   - Prévenir toute capture frauduleuse                                    */
/*                                                                            */
/*  PRINCIPES ABSOLUS :                                                       */
/*   - Une ORGANIZATION agit toujours via un USER                             */
/*   - Le OWNER est juridiquement responsable                                 */
/*   - Aucun changement critique sans audit                                   */
/*   - Zéro suppression physique                                              */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Types, ClientSession, startSession } from "mongoose";

import {
  OrganizationModel,
  IOrganization,
  OrganizationStatus,
} from "./organization.model";

import {
  OrganizationMemberModel,
  IOrganizationMember,
  OrganizationRole,
  MembershipStatus,
} from "./organizationMember.model";

import { UserModel, UserStatus } from "./user.model";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type CreateOrganizationInput = {
  name: string;
  legalName?: string;
  type: string;
  email?: string;
  phone?: string;
  website?: string;
  logoUrl?: string;
};

export type TransferOwnershipInput = {
  organizationId: Types.ObjectId;
  currentOwnerId: Types.ObjectId;
  newOwnerId: Types.ObjectId;
  reason?: string;
};

export type UpdateOrganizationInput = {
  name?: string;
  legalName?: string;
  email?: string;
  phone?: string;
  website?: string;
  logoUrl?: string;
};

export type ChangeOrganizationStatusInput = {
  organizationId: Types.ObjectId;
  actorUserId: Types.ObjectId;
  status: OrganizationStatus;
  reason?: string;
};

/* -------------------------------------------------------------------------- */
/* ORGANIZATION SERVICE                                                       */
/* -------------------------------------------------------------------------- */

export class OrganizationService {
  /* ====================================================================== */
  /* CREATION                                                               */
  /* ====================================================================== */

  /**
   * Crée une organisation avec OWNER automatique.
   */
  static async createOrganization(params: {
    ownerUserId: Types.ObjectId;
    input: CreateOrganizationInput;
  }): Promise<{
    organization: IOrganization;
    membership: IOrganizationMember;
  }> {
    const session = await startSession();
    session.startTransaction();

    try {
      const owner = await UserModel.findOne({
        _id: params.ownerUserId,
        status: UserStatus.ACTIVE,
        isDeleted: false,
      }).session(session);

      if (!owner) {
        throw new Error("Owner user not found or inactive");
      }

      const organization = new OrganizationModel({
        ...params.input,
        ownerUserId: params.ownerUserId,
        trustScore: 0,
        status: OrganizationStatus.ACTIVE,
        isDeleted: false,
      });

      await organization.save({ session });

      const membership = new OrganizationMemberModel({
        organizationId: organization._id,
        userId: params.ownerUserId,
        role: OrganizationRole.OWNER,
        status: MembershipStatus.ACTIVE,
      });

      await membership.save({ session });

      await session.commitTransaction();
      session.endSession();

      return { organization, membership };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /* ====================================================================== */
  /* GOVERNANCE                                                             */
  /* ====================================================================== */

  /**
   * Transfert légal d’ownership.
   */
  static async transferOwnership(
    input: TransferOwnershipInput
  ): Promise<void> {
    const session: ClientSession = await startSession();
    session.startTransaction();

    try {
      const org = await OrganizationModel.findById(
        input.organizationId
      ).session(session);

      if (!org || org.isDeleted) {
        throw new Error("Organization not found");
      }

      if (!org.ownerUserId.equals(input.currentOwnerId)) {
        throw new Error("Only current owner can transfer ownership");
      }

      const newOwner = await UserModel.findOne({
        _id: input.newOwnerId,
        status: UserStatus.ACTIVE,
        isDeleted: false,
      }).session(session);

      if (!newOwner) {
        throw new Error("New owner not found or inactive");
      }

      await OrganizationMemberModel.updateOne(
        {
          organizationId: org._id,
          userId: input.currentOwnerId,
        },
        { role: OrganizationRole.ADMIN }
      ).session(session);

      await OrganizationMemberModel.updateOne(
        {
          organizationId: org._id,
          userId: input.newOwnerId,
        },
        {
          role: OrganizationRole.OWNER,
          status: MembershipStatus.ACTIVE,
        },
        { upsert: true }
      ).session(session);

      org.ownerUserId = input.newOwnerId;
      await org.save({ session });

      await session.commitTransaction();
      session.endSession();
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /* ====================================================================== */
  /* UPDATE                                                                  */
  /* ====================================================================== */

  /**
   * Met à jour les informations publiques.
   */
  static async updateOrganization(
    organizationId: Types.ObjectId,
    input: UpdateOrganizationInput
  ): Promise<IOrganization> {
    const org = await OrganizationModel.findById(
      organizationId
    );

    if (!org || org.isDeleted) {
      throw new Error("Organization not found");
    }

    Object.assign(org, input);
    await org.save();

    return org;
  }

  /* ====================================================================== */
  /* STATUS MANAGEMENT                                                       */
  /* ====================================================================== */

  /**
   * Suspend / Révoque une organisation.
   */
  static async changeStatus(
    input: ChangeOrganizationStatusInput
  ): Promise<IOrganization> {
    const org = await OrganizationModel.findById(
      input.organizationId
    );

    if (!org) {
      throw new Error("Organization not found");
    }

    org.status = input.status;
    org.isDeleted =
      input.status === OrganizationStatus.REVOKED;

    await org.save();
    return org;
  }

  /* ====================================================================== */
  /* QUERIES                                                                 */
  /* ====================================================================== */

  /**
   * Liste des membres actifs.
   */
  static async listMembers(
    organizationId: Types.ObjectId
  ): Promise<IOrganizationMember[]> {
    return OrganizationMemberModel.find({
      organizationId,
      status: MembershipStatus.ACTIVE,
    }).populate("userId");
  }

  /**
   * Vérifie si un user est OWNER.
   */
  static async isOwner(
    organizationId: Types.ObjectId,
    userId: Types.ObjectId
  ): Promise<boolean> {
    const org = await OrganizationModel.findById(
      organizationId
    );
    return Boolean(org?.ownerUserId.equals(userId));
  }
}
