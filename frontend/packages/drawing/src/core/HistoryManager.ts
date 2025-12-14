import { createNanoEvents, type Emitter } from "nanoevents"
import type { Stroke } from "../types"

/**
 * History entry representing a state snapshot
 */
export interface HistoryEntry {
  readonly strokes: ReadonlyArray<Stroke>
  readonly timestamp: number
}

/**
 * Events emitted by HistoryManager
 */
export interface HistoryEvents {
  change: (state: HistoryState) => void
}

/**
 * Current history state
 */
export interface HistoryState {
  readonly canUndo: boolean
  readonly canRedo: boolean
  readonly undoCount: number
  readonly redoCount: number
  readonly isDirty: boolean
}

/**
 * Immutable history manager for undo/redo operations
 *
 * Uses a stack-based approach with configurable max history size.
 * All operations return new state snapshots for React integration.
 */
export class HistoryManager {
  private readonly undoStack: ReadonlyArray<HistoryEntry>
  private readonly redoStack: ReadonlyArray<HistoryEntry>
  private readonly maxHistorySize: number
  private readonly savedEntry: HistoryEntry | null
  private readonly emitter: Emitter<HistoryEvents>

  private constructor(
    undoStack: ReadonlyArray<HistoryEntry>,
    redoStack: ReadonlyArray<HistoryEntry>,
    maxHistorySize: number,
    savedEntry: HistoryEntry | null,
    emitter: Emitter<HistoryEvents>,
  ) {
    this.undoStack = undoStack
    this.redoStack = redoStack
    this.maxHistorySize = maxHistorySize
    this.savedEntry = savedEntry
    this.emitter = emitter
  }

  /**
   * Create a new HistoryManager with default settings
   */
  static create(maxHistorySize = 100): HistoryManager {
    return new HistoryManager([], [], maxHistorySize, null, createNanoEvents())
  }

  /**
   * Subscribe to state changes
   */
  on<K extends keyof HistoryEvents>(event: K, callback: HistoryEvents[K]) {
    return this.emitter.on(event, callback)
  }

  /**
   * Get current history state
   */
  getState(): HistoryState {
    const currentEntry = this.undoStack[this.undoStack.length - 1]
    const isDirty =
      this.savedEntry === null ? this.undoStack.length > 0 : currentEntry !== this.savedEntry

    return {
      canUndo: this.undoStack.length > 1,
      canRedo: this.redoStack.length > 0,
      undoCount: Math.max(0, this.undoStack.length - 1),
      redoCount: this.redoStack.length,
      isDirty,
    }
  }

  /**
   * Get current strokes
   */
  getCurrentStrokes(): ReadonlyArray<Stroke> {
    const lastEntry = this.undoStack[this.undoStack.length - 1]
    return lastEntry?.strokes ?? []
  }

  /**
   * Push a new state onto the history stack
   */
  push(strokes: ReadonlyArray<Stroke>): HistoryManager {
    const entry: HistoryEntry = {
      strokes,
      timestamp: Date.now(),
    }

    // Trim undo stack if exceeds max size
    let newUndoStack = [...this.undoStack, entry]
    if (newUndoStack.length > this.maxHistorySize) {
      newUndoStack = newUndoStack.slice(newUndoStack.length - this.maxHistorySize)
    }

    // Clear redo stack on new action
    const newManager = new HistoryManager(
      newUndoStack,
      [],
      this.maxHistorySize,
      this.savedEntry,
      this.emitter,
    )

    this.emitter.emit("change", newManager.getState())
    return newManager
  }

  /**
   * Initialize with strokes (without marking as dirty)
   */
  initialize(strokes: ReadonlyArray<Stroke>): HistoryManager {
    const entry: HistoryEntry = {
      strokes,
      timestamp: Date.now(),
    }

    const newManager = new HistoryManager(
      [entry],
      [],
      this.maxHistorySize,
      entry, // Set as saved entry
      this.emitter,
    )

    this.emitter.emit("change", newManager.getState())
    return newManager
  }

  /**
   * Undo the last action
   */
  undo(): { manager: HistoryManager; strokes: ReadonlyArray<Stroke> } | null {
    if (this.undoStack.length <= 1) {
      return null
    }

    const currentEntry = this.undoStack[this.undoStack.length - 1]
    if (!currentEntry) return null

    const newUndoStack = this.undoStack.slice(0, -1)
    const newRedoStack = [...this.redoStack, currentEntry]

    const newManager = new HistoryManager(
      newUndoStack,
      newRedoStack,
      this.maxHistorySize,
      this.savedEntry,
      this.emitter,
    )

    const strokes = newManager.getCurrentStrokes()
    this.emitter.emit("change", newManager.getState())

    return { manager: newManager, strokes }
  }

  /**
   * Redo the last undone action
   */
  redo(): { manager: HistoryManager; strokes: ReadonlyArray<Stroke> } | null {
    if (this.redoStack.length === 0) {
      return null
    }

    const nextEntry = this.redoStack[this.redoStack.length - 1]
    if (!nextEntry) return null

    const newUndoStack = [...this.undoStack, nextEntry]
    const newRedoStack = this.redoStack.slice(0, -1)

    const newManager = new HistoryManager(
      newUndoStack,
      newRedoStack,
      this.maxHistorySize,
      this.savedEntry,
      this.emitter,
    )

    this.emitter.emit("change", newManager.getState())
    return { manager: newManager, strokes: nextEntry.strokes }
  }

  /**
   * Mark current state as saved (resets dirty flag)
   */
  markSaved(): HistoryManager {
    const currentEntry = this.undoStack[this.undoStack.length - 1] ?? null

    const newManager = new HistoryManager(
      this.undoStack,
      this.redoStack,
      this.maxHistorySize,
      currentEntry,
      this.emitter,
    )

    this.emitter.emit("change", newManager.getState())
    return newManager
  }

  /**
   * Clear all history
   */
  clear(): HistoryManager {
    const newManager = new HistoryManager([], [], this.maxHistorySize, null, this.emitter)

    this.emitter.emit("change", newManager.getState())
    return newManager
  }
}
