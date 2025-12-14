import type React from "react"
import { match } from "ts-pattern"
import type { DockingPosition } from "../../types"

interface TabDropIndicatorProps {
  position: DockingPosition
  targetRect: DOMRect
}

/** Common base styles for tab drop indicator line */
const tabDropLineBaseStyle: React.CSSProperties = {
  position: "fixed",
  zIndex: 1100,
  backgroundColor: "var(--color-drop-indicator)",
  borderRadius: "0.125rem",
  pointerEvents: "none",
  transition: "all 0.1s cubic-bezier(0.4, 0, 0.2, 1)",
}

export const TabDropIndicator: React.FC<TabDropIndicatorProps> = ({ position, targetRect }) => {
  const { left, top, width, height } = targetRect

  return match(position)
    .with("tab-before", () => (
      <div
        style={{
          ...tabDropLineBaseStyle,
          left: left - 2,
          top,
          width: 4,
          height,
        }}
      />
    ))
    .with("tab-after", () => (
      <div
        style={{
          ...tabDropLineBaseStyle,
          left: left + width - 2,
          top,
          width: 4,
          height,
        }}
      />
    ))
    .otherwise(() => null)
}
