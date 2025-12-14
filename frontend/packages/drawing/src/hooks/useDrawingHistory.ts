import { useCallback, useRef, useState } from "react"
import { HistoryManager, type HistoryState } from "../core/HistoryManager"
import type { Stroke } from "../types"

/**
 * Hook return type
 */
export interface UseDrawingHistoryReturn {
  /** Current strokes */
  strokes: ReadonlyArray<Stroke>
  /** Current history state */
  historyState: HistoryState
  /** Push new strokes to history */
  push: (strokes: ReadonlyArray<Stroke>) => void
  /** Initialize with strokes (without dirty flag) */
  initialize: (strokes: ReadonlyArray<Stroke>) => void
  /** Undo last action */
  undo: () => void
  /** Redo last undone action */
  redo: () => void
  /** Mark current state as saved */
  markSaved: () => void
  /** Clear all history */
  clear: () => void
}

/**
 * React hook for managing drawing history with undo/redo
 *
 * Provides a reactive interface to HistoryManager with
 * automatic subscription to state changes.
 */
export function useDrawingHistory(initialStrokes?: ReadonlyArray<Stroke>): UseDrawingHistoryReturn {
  // Create initial manager - will be initialized with strokes if provided
  const [manager, setManager] = useState<HistoryManager>(() => {
    const m = HistoryManager.create()
    if (initialStrokes && initialStrokes.length > 0) {
      return m.initialize(initialStrokes)
    }
    return m
  })

  // Use useState for reactive updates - initialize from manager
  const [strokes, setStrokes] = useState<ReadonlyArray<Stroke>>(() => manager.getCurrentStrokes())
  const [historyState, setHistoryState] = useState<HistoryState>(() => manager.getState())

  // Keep manager ref for callbacks (avoids stale closure)
  const managerRef = useRef<HistoryManager>(manager)
  managerRef.current = manager

  // Helper to update React state from manager
  const syncState = useCallback((newManager: HistoryManager) => {
    managerRef.current = newManager
    setManager(newManager)
    setStrokes(newManager.getCurrentStrokes())
    setHistoryState(newManager.getState())
  }, [])

  const push = useCallback(
    (newStrokes: ReadonlyArray<Stroke>) => {
      const newManager = managerRef.current.push(newStrokes)
      syncState(newManager)
    },
    [syncState],
  )

  const initialize = useCallback(
    (newStrokes: ReadonlyArray<Stroke>) => {
      const newManager = managerRef.current.initialize(newStrokes)
      syncState(newManager)
    },
    [syncState],
  )

  const undo = useCallback(() => {
    const result = managerRef.current.undo()
    if (result) {
      syncState(result.manager)
    }
  }, [syncState])

  const redo = useCallback(() => {
    const result = managerRef.current.redo()
    if (result) {
      syncState(result.manager)
    }
  }, [syncState])

  const markSaved = useCallback(() => {
    const newManager = managerRef.current.markSaved()
    syncState(newManager)
  }, [syncState])

  const clear = useCallback(() => {
    const newManager = managerRef.current.clear()
    syncState(newManager)
  }, [syncState])

  return {
    strokes,
    historyState,
    push,
    initialize,
    undo,
    redo,
    markSaved,
    clear,
  }
}
