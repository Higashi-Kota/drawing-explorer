/**
 * A point on the canvas
 */
export interface Point {
  readonly x: number
  readonly y: number
}

/**
 * Drawing stroke data
 */
export interface Stroke {
  readonly id: string
  readonly points: ReadonlyArray<Point>
  readonly color: string
  readonly width: number
}

/**
 * Drawing tool type
 */
export type DrawingTool = "pencil" | "eraser"

/**
 * Drawing state for a single canvas
 */
export interface DrawingState {
  readonly strokes: ReadonlyArray<Stroke>
  readonly currentColor: string
  readonly currentWidth: number
  readonly currentTool: DrawingTool
}

/**
 * Default drawing state
 */
export const DEFAULT_DRAWING_STATE: DrawingState = {
  strokes: [],
  currentColor: "#000000",
  currentWidth: 2,
  currentTool: "pencil",
}

/**
 * Brush size presets
 */
export const BRUSH_SIZES = [2, 4, 8, 12, 20] as const

/**
 * Color palette tokens (CSS variable names)
 */
export const PALETTE_TOKENS = [
  "--color-base-palette-black",
  "--color-base-palette-red",
  "--color-base-palette-orange",
  "--color-base-palette-yellow",
  "--color-base-palette-green",
  "--color-base-palette-blue",
  "--color-base-palette-purple",
  "--color-base-palette-pink",
] as const

export type PaletteToken = (typeof PALETTE_TOKENS)[number]
