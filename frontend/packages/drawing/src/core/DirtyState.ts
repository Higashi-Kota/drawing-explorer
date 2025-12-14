import { createNanoEvents, type Emitter } from "nanoevents"

/**
 * Events emitted by DirtyStateManager
 */
export interface DirtyStateEvents {
  change: (isDirty: boolean) => void
}

/**
 * Manages dirty state for unsaved changes detection
 *
 * Tracks whether content has been modified since last save.
 * Emits events when dirty state changes.
 */
export class DirtyStateManager {
  private readonly isDirty: boolean
  private readonly savedHash: string | null
  private readonly emitter: Emitter<DirtyStateEvents>

  private constructor(
    isDirty: boolean,
    savedHash: string | null,
    emitter: Emitter<DirtyStateEvents>,
  ) {
    this.isDirty = isDirty
    this.savedHash = savedHash
    this.emitter = emitter
  }

  /**
   * Create a new DirtyStateManager
   */
  static create(): DirtyStateManager {
    return new DirtyStateManager(false, null, createNanoEvents())
  }

  /**
   * Subscribe to dirty state changes
   */
  on<K extends keyof DirtyStateEvents>(event: K, callback: DirtyStateEvents[K]) {
    return this.emitter.on(event, callback)
  }

  /**
   * Check if content is dirty (unsaved)
   */
  getIsDirty(): boolean {
    return this.isDirty
  }

  /**
   * Mark content as modified
   */
  markDirty(): DirtyStateManager {
    if (this.isDirty) {
      return this
    }

    const newManager = new DirtyStateManager(true, this.savedHash, this.emitter)
    this.emitter.emit("change", true)
    return newManager
  }

  /**
   * Mark content as saved (clears dirty flag)
   * Optionally accepts a hash to compare future content against
   */
  markSaved(contentHash?: string): DirtyStateManager {
    const newManager = new DirtyStateManager(false, contentHash ?? this.savedHash, this.emitter)

    if (this.isDirty) {
      this.emitter.emit("change", false)
    }

    return newManager
  }

  /**
   * Check if content matches saved state
   */
  matchesSaved(contentHash: string): boolean {
    return this.savedHash === contentHash
  }

  /**
   * Reset to clean state
   */
  reset(): DirtyStateManager {
    const newManager = new DirtyStateManager(false, null, this.emitter)

    if (this.isDirty) {
      this.emitter.emit("change", false)
    }

    return newManager
  }
}

/**
 * Generate a simple hash for content comparison
 * Uses a fast, non-cryptographic hash suitable for dirty checking
 */
export function hashContent(content: string): string {
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash.toString(36)
}
