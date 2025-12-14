import type { ComponentProps, Ref } from "react"

export interface BrushSizeButtonProps extends Omit<ComponentProps<"button">, "children"> {
  /** Brush size in pixels */
  size: number
  /** Whether this size is selected */
  selected?: boolean
  /** Keyboard shortcut hint */
  shortcut?: string
  /** Ref to button element */
  ref?: Ref<HTMLButtonElement>
}

/**
 * Brush size selector button
 *
 * Design features:
 * - Visual indicator dot scales with brush size
 * - Selected: Primary background with subtle inset shadow
 * - Hover: Soft accent background lift
 * - Micro-interactions: Smooth scale and color transitions
 *
 * Displays a visual indicator proportional to the brush size.
 * Uses aria-pressed for toggle semantics.
 */
export function BrushSizeButton({
  size,
  selected = false,
  shortcut,
  disabled,
  className = "",
  ref,
  ...props
}: BrushSizeButtonProps) {
  const label = `Brush size ${size}px`
  const title = shortcut ? `${label} (${shortcut})` : label

  // Clamp visual indicator size (min 4px, max 14px for visual balance)
  const indicatorSize = Math.max(4, Math.min(size, 14))

  return (
    <button
      ref={ref}
      type='button'
      aria-label={label}
      aria-pressed={selected}
      disabled={disabled}
      title={title}
      data-selected={selected ? "" : undefined}
      className={`
        grid place-items-center
        min-w-8 min-h-8 w-8 h-8
        rounded-md
        cursor-pointer
        transition-all duration-normal ease-out

        /* Default state */
        text-muted-foreground
        bg-transparent

        /* Hover - subtle background */
        hover:bg-background
        hover:text-foreground

        /* Active press */
        active:scale-95

        /* Focus ring */
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-ring
        focus-visible:ring-offset-1
        focus-visible:ring-offset-background

        /* Disabled */
        disabled:opacity-40
        disabled:cursor-not-allowed
        disabled:hover:bg-transparent
        disabled:hover:text-muted-foreground
        disabled:active:scale-100

        /* Selected state - use semantic selected color */
        data-[selected]:bg-selected
        data-[selected]:text-selected-foreground
        data-[selected]:hover:bg-selected

        ${className}
      `}
      {...props}
    >
      <span
        aria-hidden='true'
        className='rounded-full bg-current transition-all duration-normal'
        style={{ width: indicatorSize, height: indicatorSize }}
      />
    </button>
  )
}
