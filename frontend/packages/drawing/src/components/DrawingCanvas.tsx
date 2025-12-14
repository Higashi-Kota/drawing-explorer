import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useDrawingHistory } from "../hooks/useDrawingHistory"
import { useDrawingHotkeys } from "../hooks/useDrawingHotkeys"
import { BRUSH_SIZES, type DrawingTool, PALETTE_TOKENS, type Stroke } from "../types"
import { Canvas, type CanvasHandle } from "./Canvas"
import { DrawingToolbar } from "./DrawingToolbar"

export interface DrawingCanvasProps {
  /** Unique panel identifier */
  panelId: string
  /** Display file name */
  fileName?: string
  /** File path for identification */
  filePath?: string
  /** Initial strokes to load */
  initialStrokes?: ReadonlyArray<Stroke>
  /** Callback when save is requested */
  onSave?: (panelId: string, strokes: ReadonlyArray<Stroke>) => void
  /** Whether hotkeys are enabled (disable when not focused) */
  hotkeysEnabled?: boolean
}

/**
 * Get CSS variable value from computed styles
 */
function getCssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

/**
 * Resolve palette colors from CSS variables
 */
function resolveColors(): string[] {
  const fallbackColor = getCssVar("--color-fallback-color") || "black"
  return PALETTE_TOKENS.map((token) => getCssVar(token) || fallbackColor)
}

/**
 * Complete drawing canvas component with toolbar
 *
 * Integrates:
 * - Canvas for drawing
 * - Toolbar for tool/color/brush selection
 * - Undo/redo history
 * - Keyboard shortcuts
 * - Dirty state tracking
 *
 * WAI-ARIA compliant with keyboard navigation support.
 */
export function DrawingCanvas({
  panelId,
  fileName: _fileName,
  filePath: _filePath,
  initialStrokes,
  onSave,
  hotkeysEnabled = true,
}: DrawingCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<CanvasHandle>(null)

  // Drawing state
  const [currentTool, setCurrentTool] = useState<DrawingTool>("pencil")
  const [currentColor, setCurrentColor] = useState<string>("")
  const [currentBrushSize, setCurrentBrushSize] = useState<number>(BRUSH_SIZES[0])

  // History management
  const {
    strokes,
    historyState,
    push: pushHistory,
    undo,
    redo,
    markSaved,
  } = useDrawingHistory(initialStrokes)

  // Resolve colors from CSS
  const colors = useMemo(() => resolveColors(), [])
  const canvasColor = useMemo(() => getCssVar("--color-canvas") || "#ffffff", [])

  // Initialize color from palette
  useEffect(() => {
    if (colors.length > 0 && !currentColor) {
      setCurrentColor(colors[0])
    }
  }, [colors, currentColor])

  // Calculate effective stroke color/width based on tool
  const effectiveColor = currentTool === "eraser" ? canvasColor : currentColor
  const effectiveWidth = currentTool === "eraser" ? currentBrushSize * 2 : currentBrushSize

  // Handle stroke completion
  const handleStrokeComplete = useCallback(
    (stroke: Stroke) => {
      const newStrokes = [...strokes, stroke]
      pushHistory(newStrokes)
    },
    [strokes, pushHistory],
  )

  // Handle save
  const handleSave = useCallback(() => {
    onSave?.(panelId, strokes)
    markSaved()
  }, [panelId, strokes, onSave, markSaved])

  // Handle clear
  const handleClear = useCallback(() => {
    if (strokes.length === 0) return
    pushHistory([])
  }, [strokes, pushHistory])

  // Handle tool change
  const handleToolChange = useCallback((tool: DrawingTool) => {
    setCurrentTool(tool)
  }, [])

  // Handle color change
  const handleColorChange = useCallback((color: string) => {
    setCurrentColor(color)
    // Auto-switch to pencil when selecting color
    setCurrentTool("pencil")
  }, [])

  // Handle brush size change
  const handleBrushSizeChange = useCallback((size: number) => {
    setCurrentBrushSize(size)
  }, [])

  // Handle color change by index (for hotkeys)
  const handleColorIndexChange = useCallback(
    (index: number) => {
      const color = colors[index]
      if (color) {
        setCurrentColor(color)
        setCurrentTool("pencil")
      }
    },
    [colors],
  )

  // Setup hotkeys
  const { getHotkeyDisplay } = useDrawingHotkeys(
    {
      onUndo: undo,
      onRedo: redo,
      onSave: onSave ? handleSave : undefined,
      onClear: handleClear,
      onToolChange: handleToolChange,
      onBrushSizeChange: handleBrushSizeChange,
      onColorChange: handleColorIndexChange,
    },
    {
      enabled: hotkeysEnabled,
      targetRef: containerRef,
    },
  )

  return (
    <div ref={containerRef} className='grid grid-rows-[auto_1fr] w-full h-full -m-2'>
      <DrawingToolbar
        currentTool={currentTool}
        currentColor={currentColor}
        currentBrushSize={currentBrushSize}
        colors={colors}
        isDirty={historyState.isDirty}
        canUndo={historyState.canUndo}
        canRedo={historyState.canRedo}
        hasStrokes={strokes.length > 0}
        onToolChange={handleToolChange}
        onColorChange={handleColorChange}
        onBrushSizeChange={handleBrushSizeChange}
        onUndo={undo}
        onRedo={redo}
        onSave={onSave ? handleSave : undefined}
        onClear={handleClear}
        getHotkeyDisplay={getHotkeyDisplay}
      />

      <Canvas
        ref={canvasRef}
        strokes={strokes}
        strokeColor={effectiveColor}
        strokeWidth={effectiveWidth}
        backgroundColor={canvasColor}
        enabled={true}
        onStrokeComplete={handleStrokeComplete}
      />
    </div>
  )
}
