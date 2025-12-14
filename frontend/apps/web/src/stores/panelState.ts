import { atom } from "jotai"
import { atomFamily } from "jotai-family"

/**
 * Drawing stroke data
 */
export interface Stroke {
  readonly id: string
  readonly points: ReadonlyArray<{ x: number; y: number }>
  readonly color: string
  readonly width: number
}

/**
 * Panel-specific drawing state
 */
export interface PanelDrawingState {
  readonly strokes: ReadonlyArray<Stroke>
  readonly currentColor: string
  readonly currentWidth: number
  readonly zoom: number
  readonly panX: number
  readonly panY: number
}

/**
 * Default panel drawing state
 */
const defaultPanelDrawingState: PanelDrawingState = {
  strokes: [],
  currentColor: "#000000",
  currentWidth: 2,
  zoom: 1,
  panX: 0,
  panY: 0,
}

/**
 * Panel drawing state atom family - indexed by panelId
 *
 * Each panel has its own isolated drawing state that persists
 * even when the panel is not active (hidden behind other tabs).
 */
export const panelDrawingStateFamily = atomFamily((_panelId: string) =>
  atom<PanelDrawingState>(defaultPanelDrawingState),
)

/**
 * Atom to track all panel IDs that have state
 */
export const activePanelIdsAtom = atom<ReadonlySet<string>>(new Set<string>())

/**
 * Derived atom to get panel state with ID tracking
 */
export const getPanelStateAtom = (panelId: string) => {
  return atom(
    (get) => get(panelDrawingStateFamily(panelId)),
    (get, set, newState: PanelDrawingState | ((prev: PanelDrawingState) => PanelDrawingState)) => {
      const currentIds = get(activePanelIdsAtom)
      if (!currentIds.has(panelId)) {
        set(activePanelIdsAtom, new Set([...currentIds, panelId]))
      }

      const stateAtom = panelDrawingStateFamily(panelId)
      if (typeof newState === "function") {
        set(stateAtom, newState(get(stateAtom)))
      } else {
        set(stateAtom, newState)
      }
    },
  )
}

/**
 * Action atoms for common operations
 */

// Add stroke to panel
export const addStrokeAtom = atomFamily((panelId: string) =>
  atom(null, (get, set, stroke: Stroke) => {
    const stateAtom = panelDrawingStateFamily(panelId)
    const currentState = get(stateAtom)
    set(stateAtom, {
      ...currentState,
      strokes: [...currentState.strokes, stroke],
    })
  }),
)

// Clear all strokes from panel
export const clearStrokesAtom = atomFamily((panelId: string) =>
  atom(null, (get, set) => {
    const stateAtom = panelDrawingStateFamily(panelId)
    const currentState = get(stateAtom)
    set(stateAtom, {
      ...currentState,
      strokes: [],
    })
  }),
)

// Update drawing settings for panel
export const updateDrawingSettingsAtom = atomFamily((panelId: string) =>
  atom(null, (get, set, settings: { color?: string; width?: number }) => {
    const stateAtom = panelDrawingStateFamily(panelId)
    const currentState = get(stateAtom)
    set(stateAtom, {
      ...currentState,
      currentColor: settings.color ?? currentState.currentColor,
      currentWidth: settings.width ?? currentState.currentWidth,
    })
  }),
)

// Update viewport for panel
export const updateViewportAtom = atomFamily((panelId: string) =>
  atom(null, (get, set, viewport: { zoom?: number; panX?: number; panY?: number }) => {
    const stateAtom = panelDrawingStateFamily(panelId)
    const currentState = get(stateAtom)
    set(stateAtom, {
      ...currentState,
      zoom: viewport.zoom ?? currentState.zoom,
      panX: viewport.panX ?? currentState.panX,
      panY: viewport.panY ?? currentState.panY,
    })
  }),
)

/**
 * Remove panel state when panel is closed
 */
export const removePanelStateAtom = atom(null, (get, set, panelId: string) => {
  const currentIds = get(activePanelIdsAtom)
  if (currentIds.has(panelId)) {
    const newIds = new Set(currentIds)
    newIds.delete(panelId)
    set(activePanelIdsAtom, newIds)
  }
  // Remove from atomFamily cache to prevent memory leaks
  panelDrawingStateFamily.remove(panelId)
  addStrokeAtom.remove(panelId)
  clearStrokesAtom.remove(panelId)
  updateDrawingSettingsAtom.remove(panelId)
  updateViewportAtom.remove(panelId)
})
