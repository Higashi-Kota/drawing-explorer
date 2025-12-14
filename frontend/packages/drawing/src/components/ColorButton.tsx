import type { ComponentProps, Ref } from "react"

export interface ColorButtonProps extends Omit<ComponentProps<"button">, "children"> {
  /** Color value (CSS color string) */
  color: string
  /** Color name for accessibility */
  colorName: string
  /** Whether this color is selected */
  selected?: boolean
  /** Keyboard shortcut hint */
  shortcut?: string
  /** Ref to button element */
  ref?: Ref<HTMLButtonElement>
}

/**
 * Color picker button for drawing palette
 *
 * Design features:
 * - Circular swatch with subtle shadow depth
 * - Selected: Smaller circle with dot indicator below
 * - Hover: Gentle lift with enhanced shadow
 * - Inner highlight for glass-like appearance
 * - Smooth 150ms transitions using design token duration
 *
 * Follows WAI-ARIA button pattern with toggle semantics.
 */
export function ColorButton({
  color,
  colorName,
  selected = false,
  shortcut,
  disabled,
  className = "",
  ref,
  ...props
}: ColorButtonProps) {
  const title = shortcut ? `${colorName} (${shortcut})` : colorName

  return (
    <div className='flex flex-col items-center gap-0.5 w-6'>
      {/* Fixed size container to prevent layout shift */}
      <div className='w-5 h-5 grid place-items-center'>
        <button
          ref={ref}
          type='button'
          aria-label={colorName}
          aria-pressed={selected}
          disabled={disabled}
          title={title}
          data-selected={selected ? "" : undefined}
          className={`
            relative
            rounded-full
            cursor-pointer
            transition-all duration-normal ease-out

            /* Size - larger when selected */
            w-4 h-4
            data-[selected]:w-5 data-[selected]:h-5

            /* Base shadow for depth */
            shadow-sm

            /* Border for definition */
            border border-white/40

            /* Hover - lift effect */
            hover:scale-110
            hover:shadow-md

            /* Active press */
            active:scale-95

            /* Focus ring */
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-ring
            focus-visible:ring-offset-2
            focus-visible:ring-offset-background

            /* Disabled */
            disabled:opacity-40
            disabled:cursor-not-allowed
            disabled:hover:scale-100
            disabled:hover:shadow-sm

            ${className}
          `}
          style={{ backgroundColor: color }}
          {...props}
        >
          {/* Visual check indicator for screen readers */}
          {selected && <span className='sr-only'>Selected</span>}
        </button>
      </div>
      {/* Selection dot indicator */}
      <span
        aria-hidden='true'
        className='
          w-1.5 h-1.5
          rounded-full
          transition-all duration-normal ease-out
        '
        style={{ backgroundColor: selected ? "var(--color-foreground)" : "transparent" }}
      />
    </div>
  )
}
