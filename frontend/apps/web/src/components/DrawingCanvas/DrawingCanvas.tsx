import { useAtom } from "jotai"
import { Eraser, Pencil, Redo, Save, Trash2, Undo } from "lucide-react"
import type React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { panelDrawingStateFamily, type Stroke } from "../../stores/panelState"

interface Point {
  x: number
  y: number
}

interface LocalStroke {
  points: Point[]
  color: string
  width: number
}

interface DrawingCanvasProps {
  panelId: string
  fileName?: string
  isUnsaved?: boolean
  onSave?: (panelId: string, strokes: ReadonlyArray<Stroke>) => void
}

/**
 * Get CSS variable value from computed styles
 */
const getCssVar = (name: string): string => {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

/**
 * Drawing palette colors - references design tokens
 */
const PALETTE_TOKENS = [
  "--color-base-palette-black",
  "--color-base-palette-red",
  "--color-base-palette-orange",
  "--color-base-palette-yellow",
  "--color-base-palette-green",
  "--color-base-palette-blue",
  "--color-base-palette-purple",
  "--color-base-palette-pink",
] as const

const BRUSH_SIZES = [2, 4, 8, 12, 20]

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  panelId,
  fileName: _fileName,
  isUnsaved = false,
  onSave,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Use jotai atom for panel-specific state
  const panelStateAtom = useMemo(() => panelDrawingStateFamily(panelId), [panelId])
  const [panelState, setPanelState] = useAtom(panelStateAtom)

  // Local state for current stroke (not persisted until complete)
  const [currentStroke, setCurrentStroke] = useState<LocalStroke | null>(null)

  // Undo/redo stacks (local to this component instance)
  const [undoStack, setUndoStack] = useState<ReadonlyArray<Stroke>[]>([])
  const [redoStack, setRedoStack] = useState<ReadonlyArray<Stroke>[]>([])

  // Resolve palette colors from CSS variables with fallbacks
  const fallbackColor = getCssVar("--color-fallback-color") || "black"
  const fallbackCanvas = getCssVar("--color-fallback-canvas") || "#ffffff"
  const colors = PALETTE_TOKENS.map((token) => getCssVar(token) || fallbackColor)
  const canvasColor = getCssVar("--color-canvas") || fallbackCanvas

  // Use panel state for color and brush size
  const selectedColor = panelState.currentColor
  const brushSize = panelState.currentWidth
  const [tool, setTool] = useState<"pencil" | "eraser">("pencil")

  const setSelectedColor = useCallback(
    (color: string) => {
      setPanelState((prev) => ({ ...prev, currentColor: color }))
    },
    [setPanelState],
  )

  const setBrushSize = useCallback(
    (size: number) => {
      setPanelState((prev) => ({ ...prev, currentWidth: size }))
    },
    [setPanelState],
  )

  const isDrawing = useRef(false)
  const dprRef = useRef(1)

  // Draw all strokes on canvas
  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = dprRef.current

    // Reset transform and clear
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = canvasColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Scale for high DPI
    ctx.scale(dpr, dpr)

    // Combine persisted strokes with current stroke being drawn
    const allStrokes: Array<{ points: ReadonlyArray<Point>; color: string; width: number }> =
      currentStroke ? [...panelState.strokes, currentStroke] : [...panelState.strokes]

    for (const stroke of allStrokes) {
      if (stroke.points.length < 2) continue

      ctx.beginPath()
      ctx.strokeStyle = stroke.color
      ctx.lineWidth = stroke.width
      ctx.lineCap = "round"
      ctx.lineJoin = "round"

      const firstPoint = stroke.points[0]
      if (firstPoint) {
        ctx.moveTo(firstPoint.x, firstPoint.y)
      }

      for (let i = 1; i < stroke.points.length; i++) {
        const point = stroke.points[i]
        if (point) {
          ctx.lineTo(point.x, point.y)
        }
      }

      ctx.stroke()
    }
  }, [panelState.strokes, currentStroke, canvasColor])

  // Resize canvas using ResizeObserver for proper container size tracking
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver(([entry]) => {
      const canvas = canvasRef.current
      if (!canvas || !entry) return

      // Get device pixel ratio for high DPI displays
      const dpr = window.devicePixelRatio || 1
      dprRef.current = dpr

      // Get container CSS size
      const { width, height } = entry.contentRect

      // Set canvas internal resolution for high DPI
      canvas.width = width * dpr
      canvas.height = height * dpr

      // CSS size is handled by inset-0 w-full h-full classes
      redraw()
    })

    observer.observe(container)

    return () => {
      observer.disconnect()
    }
  }, [redraw])

  // Redraw when strokes change
  useEffect(() => {
    redraw()
  }, [redraw])

  const getPointFromEvent = (e: React.MouseEvent): Point => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    isDrawing.current = true
    const point = getPointFromEvent(e)

    const color = tool === "eraser" ? canvasColor : selectedColor
    const width = tool === "eraser" ? brushSize * 2 : brushSize

    setCurrentStroke({
      points: [point],
      color,
      width,
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing.current || !currentStroke) return

    const point = getPointFromEvent(e)
    setCurrentStroke((prev) => {
      if (!prev) return null
      return {
        ...prev,
        points: [...prev.points, point],
      }
    })
  }

  const handleMouseUp = () => {
    if (!isDrawing.current || !currentStroke) return

    isDrawing.current = false

    // Save undo state
    setUndoStack((prev) => [...prev, panelState.strokes])
    setRedoStack([])

    // Create stroke with unique ID and add to panel state
    const newStroke: Stroke = {
      id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      points: currentStroke.points,
      color: currentStroke.color,
      width: currentStroke.width,
    }

    setPanelState((prev) => ({
      ...prev,
      strokes: [...prev.strokes, newStroke],
    }))
    setCurrentStroke(null)
  }

  const handleMouseLeave = () => {
    if (isDrawing.current && currentStroke) {
      handleMouseUp()
    }
  }

  const handleUndo = () => {
    if (undoStack.length === 0) return

    const previousState = undoStack[undoStack.length - 1]
    if (!previousState) return

    setRedoStack((prev) => [...prev, panelState.strokes])
    setPanelState((prev) => ({ ...prev, strokes: previousState }))
    setUndoStack((prev) => prev.slice(0, -1))
  }

  const handleRedo = () => {
    if (redoStack.length === 0) return

    const nextState = redoStack[redoStack.length - 1]
    if (!nextState) return

    setUndoStack((prev) => [...prev, panelState.strokes])
    setPanelState((prev) => ({ ...prev, strokes: nextState }))
    setRedoStack((prev) => prev.slice(0, -1))
  }

  const handleClear = () => {
    if (panelState.strokes.length === 0) return

    setUndoStack((prev) => [...prev, panelState.strokes])
    setRedoStack([])
    setPanelState((prev) => ({ ...prev, strokes: [] }))
  }

  return (
    <div className='w-full h-full flex flex-col -m-2'>
      {/* Toolbar */}
      <div className='flex items-center gap-3 px-3 py-1.5 border-b border-border bg-muted/30'>
        {/* Tools */}
        <div className='flex items-center gap-1 p-1 bg-muted rounded-lg'>
          <button
            type='button'
            onClick={() => setTool("pencil")}
            className={`p-2 rounded-md transition-colors ${
              tool === "pencil"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-background text-muted-foreground"
            }`}
            aria-label='Pencil'
          >
            <Pencil className='w-4 h-4' />
          </button>
          <button
            type='button'
            onClick={() => setTool("eraser")}
            className={`p-2 rounded-md transition-colors ${
              tool === "eraser"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-background text-muted-foreground"
            }`}
            aria-label='Eraser'
          >
            <Eraser className='w-4 h-4' />
          </button>
        </div>

        {/* Colors */}
        <div className='flex items-center gap-1'>
          {colors.map((color, index) => (
            <button
              key={PALETTE_TOKENS[index]}
              type='button'
              onClick={() => setSelectedColor(color)}
              className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                selectedColor === color ? "border-foreground scale-110" : "border-transparent"
              }`}
              style={{ backgroundColor: color }}
              aria-label={`Color ${PALETTE_TOKENS[index]?.replace("--color-base-palette-", "")}`}
            />
          ))}
        </div>

        {/* Brush size */}
        <div className='flex items-center gap-1'>
          {BRUSH_SIZES.map((size) => (
            <button
              key={size}
              type='button'
              onClick={() => setBrushSize(size)}
              className={`flex items-center justify-center w-8 h-8 rounded-md transition-colors ${
                brushSize === size
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground"
              }`}
              aria-label={`Brush size ${size}`}
            >
              <div
                className='rounded-full bg-current'
                style={{ width: Math.min(size, 16), height: Math.min(size, 16) }}
              />
            </button>
          ))}
        </div>

        <div className='flex-1' />

        {/* Actions */}
        <div className='flex items-center gap-1'>
          {/* Save button - only show for unsaved canvases */}
          {isUnsaved && onSave && (
            <button
              type='button'
              onClick={() => onSave(panelId, panelState.strokes)}
              disabled={panelState.strokes.length === 0}
              className='p-2 rounded-md hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-30 text-primary'
              aria-label='Save drawing'
            >
              <Save className='w-4 h-4' />
            </button>
          )}
          <button
            type='button'
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className='p-2 rounded-md hover:bg-muted transition-colors disabled:opacity-30'
            aria-label='Undo'
          >
            <Undo className='w-4 h-4 text-muted-foreground' />
          </button>
          <button
            type='button'
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className='p-2 rounded-md hover:bg-muted transition-colors disabled:opacity-30'
            aria-label='Redo'
          >
            <Redo className='w-4 h-4 text-muted-foreground' />
          </button>
          <button
            type='button'
            onClick={handleClear}
            disabled={panelState.strokes.length === 0}
            className='p-2 rounded-md hover:bg-muted transition-colors disabled:opacity-30'
            aria-label='Clear canvas'
          >
            <Trash2 className='w-4 h-4 text-muted-foreground' />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className='relative flex-1 w-full h-full min-h-0 overflow-hidden bg-white'
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          className='block absolute inset-0 w-full h-full cursor-crosshair'
        />
      </div>
    </div>
  )
}
