/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE IDENTITY — PUBLIC API SURFACE (CANONICAL EXPORT LAYER)         */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/identity/index.ts                                  */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  OBJECTIF STRATÉGIQUE :                                                    */
/*   - Centraliser tous les exports publics                                   */
/*   - Garantir la stabilité contractuelle                                    */
/*   - Éviter toute dépendance circulaire                                     */
/*   - Permettre l'évolution interne sans rupture                             */
/*                                                                            */
/*  RÈGLES ABSOLUES :                                                         */
/*   - Aucun import direct depuis les sous-fichiers                           */
/*   - Tous les modules passent UNIQUEMENT par ce fichier                     */
/*   - Toute modification est versionnée                                      */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* ========================================================================== */
/* TYPES & ENUMS (CONTRACT FIRST)                                             */
/* ========================================================================== */

export {
  IdentityKind,
  VerificationLevel,
  TrustScore,
  OrgRole,
  IdentityRef,
  PersonIdentityRef,
  OrganizationIdentityRef,
  GuestIdentityRef,
  IdentityContext,
  ModuleName,
  ModuleAction,
  IdentityEvent,
  IDENTITY_INVARIANTS,
  isPerson,
  isOrganization,
  isGuest,
} from "./identity.types";

/* ========================================================================== */
/* USER (PERSON)                                                              */
/* ========================================================================== */

export {
  UserModel,
  IUser,
  AccountType,
  UserStatus,
  VerificationLevel as UserVerificationLevel,
} from "./user.model";

/* ========================================================================== */
/* ORGANIZATION                                                               */
/* ========================================================================== */

export {
  OrganizationModel,
  IOrganization,
  OrganizationType,
  OrganizationStatus,
  VerificationLevel as OrganizationVerificationLevel,
} from "./organization.model";

/* ========================================================================== */
/* ORGANIZATION MEMBERSHIP                                                    */
/* ========================================================================== */

export {
  OrganizationMemberModel,
  IOrganizationMember,
  OrganizationRole,
  MembershipStatus,
} from "./organizationMember.model";

/* ========================================================================== */
/* SERVICES (WRITE ONLY ENTRY POINTS)                                         */
/* ========================================================================== */

export {
  IdentityService,
  CreateUserInput,
  CreateOrganizationInput,
  AddMemberInput,
} from "./identity.service";

export {
  OrganizationService,
  CreateOrganizationInput as OrgCreateInput,
  TransferOwnershipInput,
  UpdateOrganizationInput,
  ChangeOrganizationStatusInput,
} from "./organization.service";

/* ========================================================================== */
/* VERSION TAG (OBSERVABILITY / MIGRATION)                                    */
/* ========================================================================== */

/**
 * Version publique du module Identity.
 * Permet :
 *  - migration progressive
 *  - compatibilité multi-services
 *  - rollback contrôlé
 */
export const IDENTITY_PUBLIC_API_VERSION = "1.0.0";

/* ========================================================================== */
/* IMMUTABILITY GUARD (DEV SAFETY)                                            */
/* ========================================================================== */

/**
 * ⚠️ Sécurité développeur :
 * Empêche toute mutation accidentelle du module exporté.
 * (utile en monorepo / plugin ecosystem)
 */
Object.freeze(exports);

/* ========================================================================== */
/* CTO NOTE                                                                   */
/* ========================================================================== */
/**
 * ✔️ Aucun module ne doit importer directement :
 *     ./user.model
 *     ./organization.model
 *     ./organizationMember.model
 *     ./identity.types
 *     ./identity.service
 *
 * ✔️ Toute dépendance passe par ce fichier.
 *
 * ✔️ Ce fichier garantit :
 *     - stabilité long terme
 *     - refactor sans breaking change
 *     - isolation des couches métier
 *
 * 👉 Ce design permet à Débrouille de scaler sur 10+ années sans dette.
 */
