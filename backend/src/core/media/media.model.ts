/* -------------------------------------------------------------------------- */
/*  CORE / MEDIA — MEDIA MODEL (RUNTIME ENTITY)                                */
/*  File: core/media/media.model.ts                                           */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  🎯 Objectifs :                                                            */
/*   - Entité runtime immutable                                               */
/*   - Lifecycle contrôlé                                                     */
/*   - Versioning automatique                                                 */
/*   - Sécurité & intégrité natives                                            */
/*   - Observabilité ready                                                    */
/*   - Offline & cache friendly                                               */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  MediaDescriptor,
  MediaID,
  MediaLifecycle,
  MediaCreateInput,
  MediaUpdateInput,
  EpochMillis,
} from "./media.types";

/* -------------------------------------------------------------------------- */
/* 🧱 ERREURS DOMAINE                                                          */
/* -------------------------------------------------------------------------- */

export class MediaInvariantError extends Error {
  constructor(message: string) {
    super(`[MediaInvariant] ${message}`);
  }
}

/* -------------------------------------------------------------------------- */
/* 🧭 HELPERS INTERNES                                                         */
/* -------------------------------------------------------------------------- */

function now(): EpochMillis {
  return Date.now();
}

function deepFreeze<T>(obj: T): Readonly<T> {
  if (obj && typeof obj === "object") {
    Object.freeze(obj);
    Object.values(obj as any).forEach((value) => {
      if (typeof value === "object" && value !== null) {
        deepFreeze(value);
      }
    });
  }
  return obj;
}

function generateId(): MediaID {
  // UUID v7 placeholder (injectable later)
  return `media_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/* -------------------------------------------------------------------------- */
/* 🔍 INVARIANTS                                                               */
/* -------------------------------------------------------------------------- */

function assertInvariant(desc: MediaDescriptor) {
  if (!desc.id) throw new MediaInvariantError("Missing id");
  if (!desc.uri) throw new MediaInvariantError("Missing uri");
  if (!desc.kind) throw new MediaInvariantError("Missing kind");
  if (!desc.metadata?.binary?.size)
    throw new MediaInvariantError("Missing binary size");
  if (!desc.security?.access?.confidentiality)
    throw new MediaInvariantError("Missing confidentiality policy");
}

/* -------------------------------------------------------------------------- */
/* 🧬 MEDIA ENTITY                                                             */
/* -------------------------------------------------------------------------- */

export class MediaEntity {
  private readonly _value: Readonly<MediaDescriptor>;

  private constructor(descriptor: MediaDescriptor) {
    assertInvariant(descriptor);
    this._value = deepFreeze({ ...descriptor });
  }

  /* ------------------------------------------------------------------------ */
  /* 🏗️ FACTORIES                                                             */
  /* ------------------------------------------------------------------------ */

  /**
   * Création initiale
   */
  static create(input: MediaCreateInput): MediaEntity {
    const createdAt = now();

    const descriptor: MediaDescriptor = {
      ...input,
      id: generateId(),
      lifecycle: "draft",
      version: 1,
      audit: {
        createdAt,
        updatedAt: createdAt,
        accessCount: 0,
        createdBy: input.audit?.createdBy,
      },
    };

    return new MediaEntity(descriptor);
  }

  /**
   * Hydratation depuis persistance / cache
   */
  static hydrate(descriptor: MediaDescriptor): MediaEntity {
    return new MediaEntity(descriptor);
  }

  /* ------------------------------------------------------------------------ */
  /* 📤 READERS                                                               */
  /* ------------------------------------------------------------------------ */

  get snapshot(): Readonly<MediaDescriptor> {
    return this._value;
  }

  get id(): MediaID {
    return this._value.id;
  }

  get lifecycle(): MediaLifecycle {
    return this._value.lifecycle;
  }

  get version(): number {
    return this._value.version ?? 1;
  }

  /* ------------------------------------------------------------------------ */
  /* 🔄 MUTATIONS CONTRÔLÉES                                                   */
  /* ------------------------------------------------------------------------ */

  /**
   * Mise à jour partielle
   */
  update(patch: MediaUpdateInput): MediaEntity {
    if (this.lifecycle === "deleted") {
      throw new MediaInvariantError("Cannot update deleted media");
    }

    const updatedAt = now();

    const next: MediaDescriptor = {
      ...this._value,
      ...patch,
      audit: {
        ...this._value.audit,
        updatedAt,
      },
      version: (this._value.version ?? 1) + 1,
    };

    return new MediaEntity(next);
  }

  /**
   * Transition de cycle de vie
   */
  transition(next: MediaLifecycle): MediaEntity {
    const allowed: Record<MediaLifecycle, MediaLifecycle[]> = {
      draft: ["processing", "deleted"],
      processing: ["ready", "corrupted", "deleted"],
      ready: ["archived", "deleted"],
      archived: ["ready", "deleted"],
      deleted: [],
      corrupted: ["deleted"],
    };

    if (!allowed[this.lifecycle].includes(next)) {
      throw new MediaInvariantError(
        `Invalid lifecycle transition ${this.lifecycle} -> ${next}`
      );
    }

    return this.update({ lifecycle: next });
  }

  /**
   * Accès lecture (tracking)
   */
  touch(): MediaEntity {
    const audit = this._value.audit ?? {};
    return this.update({
      audit: {
        ...audit,
        lastAccessedAt: now(),
        accessCount: (audit.accessCount ?? 0) + 1,
      },
    });
  }

  /* ------------------------------------------------------------------------ */
  /* 🧬 UTILITAIRES                                                            */
  /* ------------------------------------------------------------------------ */

  clone(): MediaEntity {
    return MediaEntity.hydrate({ ...this._value });
  }

  equals(other: MediaEntity): boolean {
    return this.id === other.id && this.version === other.version;
  }

  toJSON(): MediaDescriptor {
    return JSON.parse(JSON.stringify(this._value));
  }
}
