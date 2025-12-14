import type { ReactNode } from "react"

export interface ToolbarGroupProps {
  /** Accessible label for the group */
  "aria-label": string
  /** Child buttons */
  children: ReactNode
  /** Additional CSS classes */
  className?: string
}

/**
 * Toolbar button group with shared background
 *
 * Design features:
 * - Subtle muted background creates visual grouping
 * - Rounded container with consistent padding
 * - Balanced gap for comfortable touch targets
 *
 * Uses role="group" with aria-label for accessibility.
 * Note: fieldset is not appropriate here as this is a toolbar button group, not a form.
 */
export function ToolbarGroup({
  "aria-label": ariaLabel,
  children,
  className = "",
}: ToolbarGroupProps) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: role="group" is appropriate for toolbar button groups
    <div
      role='group'
      aria-label={ariaLabel}
      className={`
        grid grid-flow-col auto-cols-max gap-1
        p-1.5
        bg-muted/50 rounded-lg
        border border-border/20
        ${className}
      `}
    >
      {children}
    </div>
  )
}
