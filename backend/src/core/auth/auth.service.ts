/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE AUTH — AUTH SERVICE (WORLD #1 CANONICAL FINAL)                 */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/auth/auth.service.ts                               */
/* -------------------------------------------------------------------------- */

import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Types } from "mongoose";

import { ENV } from "../../config/env";

import { UserModel, UserStatus } from "../identity/user.model";
import {
  IdentityRef,
  IdentityKind,
  IdentityContext,
  VerificationLevel,
} from "../identity/identity.types";

import {
  AuthProvider,
  TokenType,
  SessionStatus,
  LoginInput,
  LoginResult,
  AuthErrorCode,
  AccessTokenPayload,
  RefreshTokenPayload,
} from "./auth.types";

import {
  AuthSessionModel,
  IAuthSession,
} from "./auth.session.model";

/* -------------------------------------------------------------------------- */
/* INTERNAL CRYPTO HELPERS                                                    */
/* -------------------------------------------------------------------------- */

const hashValue = (value: string): string =>
  crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");

const generateSecureId = (): string =>
  crypto.randomBytes(32).toString("hex");

/* -------------------------------------------------------------------------- */
/* JWT HELPERS                                                                */
/* -------------------------------------------------------------------------- */

const signAccessToken = (sessionId: string): string =>
  jwt.sign(
    {
      sub: sessionId,
      typ: TokenType.ACCESS,
    } satisfies AccessTokenPayload,
    ENV.JWT_ACCESS_SECRET,
    {
      expiresIn: ENV.JWT_ACCESS_EXPIRES_IN,
    } as SignOptions
  );

const signRefreshToken = (sessionId: string): string =>
  jwt.sign(
    {
      sub: sessionId,
      typ: TokenType.REFRESH,
    } satisfies RefreshTokenPayload,
    ENV.JWT_REFRESH_SECRET,
    {
      expiresIn: ENV.JWT_REFRESH_EXPIRES_IN,
    } as SignOptions
  );

/* -------------------------------------------------------------------------- */
/* AUTH SERVICE                                                               */
/* -------------------------------------------------------------------------- */

export class AuthService {
  /* ======================================================================== */
  /* LOGIN                                                                    */
  /* ======================================================================== */

  static async loginWithPassword(
    input: LoginInput
  ): Promise<LoginResult> {
    if (!input.password) {
      throw new Error(AuthErrorCode.INVALID_CREDENTIALS);
    }

    const user = await UserModel.findOne({
      $or: [
        input.email ? { email: input.email } : null,
        input.phone ? { phone: input.phone } : null,
      ].filter(Boolean),
      isDeleted: false,
    }).select("+passwordHash");

    if (!user) {
      throw new Error(AuthErrorCode.INVALID_CREDENTIALS);
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new Error(AuthErrorCode.USER_SUSPENDED);
    }

    const passwordValid = await bcrypt.compare(
      input.password,
      user.passwordHash || ""
    );

    if (!passwordValid) {
      throw new Error(AuthErrorCode.INVALID_CREDENTIALS);
    }

    const identity: IdentityRef = {
      kind: IdentityKind.PERSON,
      userId: user._id,
    };

    const identityContext: IdentityContext = {
      identity,
      trustScore: user.trustScore ?? 0,
      verificationLevel:
        (user.verificationLevel ??
          VerificationLevel.NONE) as VerificationLevel,
    };

    return this.createSession({
      identity,
      identityContext,
      provider: AuthProvider.PASSWORD,
      device: {
        deviceId: input.deviceId,
        deviceName: input.deviceName,
      },
    });
  }

  /* ======================================================================== */
  /* SESSION CREATION                                                         */
  /* ======================================================================== */

  private static async createSession(params: {
    identity: IdentityRef;
    identityContext: IdentityContext;
    provider: AuthProvider;
    device?: {
      deviceId?: string;
      deviceName?: string;
    };
  }): Promise<LoginResult> {
    const sessionId = new Types.ObjectId();

    const accessToken = signAccessToken(
      sessionId.toHexString()
    );
    const refreshToken = signRefreshToken(
      sessionId.toHexString()
    );

    const session: IAuthSession =
      await AuthSessionModel.create({
        _id: sessionId,
        identity: params.identity,
        provider: params.provider,

        accessTokenHash: hashValue(accessToken),
        refreshTokenHash: hashValue(refreshToken),

        device: params.device,

        status: SessionStatus.ACTIVE,
        expiresAt: new Date(
          Date.now() +
            ENV.JWT_REFRESH_EXPIRES_IN_MS
        ),
        lastUsedAt: new Date(),
      });

    return {
      accessToken,
      refreshToken,
      expiresIn: ENV.JWT_ACCESS_EXPIRES_IN_SEC,
      sessionId: session._id.toHexString(),
      identityContext: params.identityContext,
    };
  }

  /* ======================================================================== */
  /* ACCESS TOKEN VERIFICATION                                                */
  /* ======================================================================== */

  static async verifyAccessToken(
    token: string
  ): Promise<IdentityContext> {
    let payload: JwtPayload;

    try {
      payload = jwt.verify(
        token,
        ENV.JWT_ACCESS_SECRET
      ) as JwtPayload;
    } catch {
      throw new Error(AuthErrorCode.TOKEN_INVALID);
    }

    if (payload.typ !== TokenType.ACCESS) {
      throw new Error(AuthErrorCode.TOKEN_INVALID);
    }

    const sessionId = payload.sub;
    if (!sessionId) {
      throw new Error(AuthErrorCode.TOKEN_INVALID);
    }

    const session =
      await AuthSessionModel.findById(
        sessionId
      );

    if (!session || !session.isActive()) {
      throw new Error(AuthErrorCode.SESSION_REVOKED);
    }

    const tokenHash = hashValue(token);

    if (tokenHash !== session.accessTokenHash) {
      throw new Error(AuthErrorCode.TOKEN_INVALID);
    }

    session.lastUsedAt = new Date();
    await session.save();

    return {
      identity: session.identity,
      trustScore: 0,
      verificationLevel: VerificationLevel.NONE,
    };
  }

  /* ======================================================================== */
  /* REFRESH TOKEN ROTATION                                                   */
  /* ======================================================================== */

  static async refreshSession(
    refreshToken: string
  ): Promise<LoginResult> {
    let payload: JwtPayload;

    try {
      payload = jwt.verify(
        refreshToken,
        ENV.JWT_REFRESH_SECRET
      ) as JwtPayload;
    } catch {
      throw new Error(AuthErrorCode.TOKEN_INVALID);
    }

    if (payload.typ !== TokenType.REFRESH) {
      throw new Error(AuthErrorCode.TOKEN_INVALID);
    }

    const sessionId = payload.sub;
    if (!sessionId) {
      throw new Error(AuthErrorCode.TOKEN_INVALID);
    }

    const session =
      await AuthSessionModel.findById(
        sessionId
      );

    if (!session || !session.isActive()) {
      throw new Error(AuthErrorCode.SESSION_REVOKED);
    }

    const incomingHash =
      hashValue(refreshToken);

    if (
      session.lastRefreshTokenHash ===
      incomingHash
    ) {
      session.markCompromised(
        "Refresh token replay detected"
      );
      await session.save();
      throw new Error(AuthErrorCode.TOKEN_INVALID);
    }

    if (
      incomingHash !== session.refreshTokenHash
    ) {
      throw new Error(AuthErrorCode.TOKEN_INVALID);
    }

    const newAccessToken = signAccessToken(
      session._id.toHexString()
    );
    const newRefreshToken = signRefreshToken(
      session._id.toHexString()
    );

    session.accessTokenHash =
      hashValue(newAccessToken);
    session.refreshTokenHash =
      hashValue(newRefreshToken);
    session.lastRefreshTokenHash =
      incomingHash;
    session.lastUsedAt = new Date();

    await session.save();

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn:
        ENV.JWT_ACCESS_EXPIRES_IN_SEC,
      sessionId: session._id.toHexString(),
      identityContext: {
        identity: session.identity,
        trustScore: 0,
        verificationLevel: VerificationLevel.NONE,
      },
    };
  }

  /* ======================================================================== */
  /* SESSION REVOCATION                                                       */
  /* ======================================================================== */

  static async revokeSession(
    sessionId: Types.ObjectId
  ): Promise<void> {
    const session =
      await AuthSessionModel.findById(
        sessionId
      );

    if (!session) return;

    session.revoke("Manual logout");
    await session.save();
  }

  static async revokeAllSessionsForUser(
    userId: Types.ObjectId
  ): Promise<void> {
    await AuthSessionModel.updateMany(
      {
        "identity.userId": userId,
        status: SessionStatus.ACTIVE,
      },
      {
        $set: {
          status: SessionStatus.REVOKED,
          revokedAt: new Date(),
          revokedReason: "Global logout",
        },
      }
    );
  }
}
