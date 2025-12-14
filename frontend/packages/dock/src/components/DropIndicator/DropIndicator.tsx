import type React from "react"
import { createPortal } from "react-dom"
import { match } from "ts-pattern"
import type { DockingPosition } from "../../types"

interface DropIndicatorProps {
  position: DockingPosition
  rect: DOMRect
}

/** Common base styles for drop indicator */
const dropIndicatorBaseStyle: React.CSSProperties = {
  position: "fixed",
  zIndex: 1000,
  backgroundColor: "var(--color-drop-indicator-bg)",
  border: "2px solid var(--color-drop-indicator)",
  borderRadius: "0.375rem",
  pointerEvents: "none",
}

export const DropIndicator: React.FC<DropIndicatorProps> = ({ position, rect }) => {
  const { left, top, width, height } = rect

  const indicator = match(position)
    .with("top", () => (
      <div
        style={{
          ...dropIndicatorBaseStyle,
          left,
          top,
          width,
          height: height * 0.5,
        }}
      />
    ))
    .with("right", () => (
      <div
        style={{
          ...dropIndicatorBaseStyle,
          left: left + width * 0.5,
          top,
          width: width * 0.5,
          height,
        }}
      />
    ))
    .with("bottom", () => (
      <div
        style={{
          ...dropIndicatorBaseStyle,
          left,
          top: top + height * 0.5,
          width,
          height: height * 0.5,
        }}
      />
    ))
    .with("left", () => (
      <div
        style={{
          ...dropIndicatorBaseStyle,
          left,
          top,
          width: width * 0.5,
          height,
        }}
      />
    ))
    .with("tab-into", () => (
      <div
        style={{
          ...dropIndicatorBaseStyle,
          left,
          top,
          width,
          height,
          display: "grid",
          placeItems: "center",
          borderTopLeftRadius: "0.375rem",
          borderTopRightRadius: "0.375rem",
        }}
      >
        <span
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            color: "var(--color-primary-foreground)",
            backgroundColor: "var(--color-drop-indicator)",
            padding: "0.125rem 0.5rem",
            borderRadius: "0.125rem",
            boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
          }}
        >
          TAB
        </span>
      </div>
    ))
    .otherwise(() => null)

  return indicator ? createPortal(indicator, document.body) : null
}
