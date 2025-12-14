import type { ComponentProps, ReactNode, Ref } from "react"

export type ToolButtonVariant = "default" | "destructive"

export interface ToolButtonProps extends Omit<ComponentProps<"button">, "children"> {
  /** Button icon */
  icon: ReactNode
  /** Accessible label (required for icon-only buttons) */
  "aria-label": string
  /** Visual variant */
  variant?: ToolButtonVariant
  /** Whether button is pressed (for toggle buttons) */
  pressed?: boolean
  /** Keyboard shortcut hint */
  shortcut?: string
  /** Ref to button element */
  ref?: Ref<HTMLButtonElement>
}

/**
 * Icon button for drawing toolbar
 *
 * Design features:
 * - Default: Subtle muted appearance with gentle hover lift
 * - Pressed: Primary color with inset shadow for tactile feedback
 * - Destructive: Rose/red accent on hover for danger actions
 * - Micro-interactions: 120ms transitions, scale transform on active
 *
 * Follows WAI-ARIA button pattern with required accessible label.
 * Supports toggle mode via aria-pressed.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/button/
 */
export function ToolButton({
  icon,
  "aria-label": ariaLabel,
  variant = "default",
  pressed,
  shortcut,
  disabled,
  className = "",
  ref,
  ...props
}: ToolButtonProps) {
  const title = shortcut ? `${ariaLabel} (${shortcut})` : ariaLabel

  return (
    <button
      ref={ref}
      type='button'
      aria-label={ariaLabel}
      aria-pressed={pressed}
      disabled={disabled}
      title={title}
      data-pressed={pressed ? "" : undefined}
      data-variant={variant}
      className={`
        grid place-items-center
        min-w-8 min-h-8 p-1.5
        rounded-md
        cursor-pointer
        transition-all duration-normal ease-out

        /* Default state */
        text-muted-foreground
        bg-transparent

        /* Hover - subtle background */
        hover:bg-background
        hover:text-foreground

        /* Active/pressed visual feedback */
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

        /* Pressed/selected state - use semantic selected color */
        data-[pressed]:bg-selected
        data-[pressed]:text-selected-foreground
        data-[pressed]:hover:bg-selected

        /* Destructive variant */
        data-[variant=destructive]:hover:bg-destructive-muted
        data-[variant=destructive]:hover:text-destructive

        ${className}
      `}
      {...props}
    >
      <span aria-hidden='true' className='transition-transform duration-fast'>
        {icon}
      </span>
    </button>
  )
}
