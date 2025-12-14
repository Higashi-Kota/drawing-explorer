import { type Ref, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react"
import type { Point, Stroke } from "../types"

/**
 * Current stroke being drawn (mutable for performance)
 */
interface CurrentStroke {
  points: Point[]
  color: string
  width: number
}

export interface CanvasProps {
  /** Completed strokes to render */
  strokes: ReadonlyArray<Stroke>
  /** Current stroke color */
  strokeColor: string
  /** Current stroke width */
  strokeWidth: number
  /** Canvas background color */
  backgroundColor?: string
  /** Whether drawing is enabled */
  enabled?: boolean
  /** Callback when stroke is completed */
  onStrokeComplete?: (stroke: Stroke) => void
  /** Ref for imperative handle */
  ref?: Ref<CanvasHandle>
}

export interface CanvasHandle {
  /** Clear and redraw the canvas */
  redraw: () => void
  /** Get canvas element */
  getCanvas: () => HTMLCanvasElement | null
}

/**
 * Generate unique stroke ID
 */
function generateStrokeId(): string {
  return `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Canvas component for freehand drawing
 *
 * Uses HTML5 Canvas API with high DPI support.
 * Handles mouse events for drawing strokes.
 */
export function Canvas({
  strokes,
  strokeColor,
  strokeWidth,
  backgroundColor = "#ffffff",
  enabled = true,
  onStrokeComplete,
  ref,
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDrawingRef = useRef(false)
  const dprRef = useRef(1)
  const [currentStroke, setCurrentStroke] = useState<CurrentStroke | null>(null)

  /**
   * Draw all strokes on canvas
   */
  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = dprRef.current

    // Reset transform and clear
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Scale for high DPI
    ctx.scale(dpr, dpr)

    // Combine completed strokes with current stroke
    const allStrokes: Array<{ points: ReadonlyArray<Point>; color: string; width: number }> =
      currentStroke ? [...strokes, currentStroke] : [...strokes]

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
  }, [strokes, currentStroke, backgroundColor])

  /**
   * Handle canvas resize
   */
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver(([entry]) => {
      const canvas = canvasRef.current
      if (!canvas || !entry) return

      const dpr = window.devicePixelRatio || 1
      dprRef.current = dpr

      const { width, height } = entry.contentRect

      // Set canvas internal resolution for high DPI
      canvas.width = width * dpr
      canvas.height = height * dpr

      redraw()
    })

    observer.observe(container)

    return () => {
      observer.disconnect()
    }
  }, [redraw])

  /**
   * Redraw when strokes change
   */
  useEffect(() => {
    redraw()
  }, [redraw])

  /**
   * Get point from mouse event
   */
  const getPointFromEvent = (e: React.MouseEvent): Point => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  /**
   * Handle drawing start
   */
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!enabled) return

    isDrawingRef.current = true
    const point = getPointFromEvent(e)

    setCurrentStroke({
      points: [point],
      color: strokeColor,
      width: strokeWidth,
    })
  }

  /**
   * Handle drawing move
   */
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawingRef.current || !currentStroke || !enabled) return

    const point = getPointFromEvent(e)
    setCurrentStroke((prev) => {
      if (!prev) return null
      return {
        ...prev,
        points: [...prev.points, point],
      }
    })
  }

  /**
   * Handle drawing end
   */
  const handleMouseUp = () => {
    if (!isDrawingRef.current || !currentStroke) return

    isDrawingRef.current = false

    // Create completed stroke
    const newStroke: Stroke = {
      id: generateStrokeId(),
      points: currentStroke.points,
      color: currentStroke.color,
      width: currentStroke.width,
    }

    onStrokeComplete?.(newStroke)
    setCurrentStroke(null)
  }

  /**
   * Handle mouse leaving canvas
   */
  const handleMouseLeave = () => {
    if (isDrawingRef.current && currentStroke) {
      handleMouseUp()
    }
  }

  /**
   * Expose imperative handle
   */
  useImperativeHandle(ref, () => ({
    redraw,
    getCanvas: () => canvasRef.current,
  }))

  return (
    <div
      ref={containerRef}
      className='relative w-full h-full min-h-0 overflow-hidden'
      style={{ backgroundColor }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        className={`
          block absolute inset-0 w-full h-full
          ${enabled ? "cursor-crosshair" : "cursor-default"}
        `}
        aria-label='Drawing canvas'
        role='img'
      />
    </div>
  )
}
