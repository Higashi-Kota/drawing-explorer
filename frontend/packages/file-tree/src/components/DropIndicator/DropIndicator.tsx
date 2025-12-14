import type React from "react"
import type { DropPosition } from "../../types"

interface DropIndicatorProps {
  position: DropPosition
  indent?: number
}

export const DropIndicator: React.FC<DropIndicatorProps> = ({ position, indent = 0 }) => {
  if (position === "inside") {
    return null
  }

  const isTop = position === "before"

  return (
    <div
      className='pointer-events-none'
      style={{
        position: "absolute",
        left: `${indent - 4}px`,
        right: 0,
        top: isTop ? "-1px" : "auto",
        bottom: isTop ? "auto" : "-1px",
        height: "2px",
        zIndex: 50,
      }}
    >
      {/* Circle indicator */}
      <div
        className='rounded-full'
        style={{
          position: "absolute",
          left: 0,
          top: "-3px",
          width: "8px",
          height: "8px",
          backgroundColor: "var(--color-drop-indicator)",
        }}
      />
      {/* Line indicator */}
      <div
        className='rounded-full'
        style={{
          position: "absolute",
          left: "8px",
          right: 0,
          top: 0,
          height: "2px",
          backgroundColor: "var(--color-drop-indicator)",
        }}
      />
    </div>
  )
}
