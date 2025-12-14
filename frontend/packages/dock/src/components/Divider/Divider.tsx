import type React from "react"
import { useRef, useState } from "react"

interface DividerProps {
  direction: "horizontal" | "vertical"
  nodeId: string
  size: number
  onResize: (nodeId: string, newSize: number) => void
}

export const Divider: React.FC<DividerProps> = ({ direction, nodeId, size, onResize }) => {
  const ref = useRef<HTMLDivElement | null>(null)
  const [dragging, setDragging] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const initialSizeRef = useRef(size)

  const valueNow = Math.round(size * 100)

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    setDragging(true)
    setStartPos({ x: e.clientX, y: e.clientY })
    initialSizeRef.current = size

    if (ref.current != null) {
      ref.current.setPointerCapture(e.pointerId)
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    if (dragging) {
      e.preventDefault()
      setDragging(false)
      if (ref.current != null) {
        ref.current.releasePointerCapture(e.pointerId)
      }
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return
    e.preventDefault()

    const container = ref.current?.parentElement
    if (container == null) return

    const rect = container.getBoundingClientRect()
    const delta =
      direction === "horizontal"
        ? (e.clientX - startPos.x) / rect.width
        : (e.clientY - startPos.y) / rect.height

    const newSize = Math.max(0.1, Math.min(0.9, initialSizeRef.current + delta))
    onResize(nodeId, newSize)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = 0.05
    let newSize = size

    if (direction === "horizontal") {
      if (e.key === "ArrowLeft") newSize = Math.max(0.1, size - step)
      else if (e.key === "ArrowRight") newSize = Math.min(0.9, size + step)
    } else {
      if (e.key === "ArrowUp") newSize = Math.max(0.1, size - step)
      else if (e.key === "ArrowDown") newSize = Math.min(0.9, size + step)
    }

    if (newSize !== size) {
      e.preventDefault()
      onResize(nodeId, newSize)
    }
  }

  return (
    // biome-ignore lint/a11y/useSemanticElements: Custom resizable divider requires role="separator" for ARIA slider pattern with aria-valuenow
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerMove={onPointerMove}
      onKeyDown={onKeyDown}
      className={`
        dock-divider z-10 touch-none transition-all
        ${direction === "horizontal" ? "w-1 cursor-col-resize" : "h-1 cursor-row-resize"}
        ${dragging ? "bg-primary opacity-100" : "bg-border opacity-50 hover:opacity-75"}
      `}
      role='separator'
      tabIndex={0}
      aria-orientation={direction}
      aria-valuenow={valueNow}
      aria-valuemin={10}
      aria-valuemax={90}
      aria-label={`Resize ${direction === "horizontal" ? "horizontally" : "vertically"}`}
    />
  )
}
