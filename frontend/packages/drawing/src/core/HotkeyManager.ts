import { match } from "ts-pattern"

/**
 * Drawing hotkey commands
 */
export const DRAWING_COMMANDS = {
  // Tool selection
  TOOL_PENCIL: "toolPencil",
  TOOL_ERASER: "toolEraser",

  // Actions
  UNDO: "undo",
  REDO: "redo",
  SAVE: "save",
  CLEAR: "clear",

  // Brush size
  BRUSH_SIZE_1: "brushSize1",
  BRUSH_SIZE_2: "brushSize2",
  BRUSH_SIZE_3: "brushSize3",
  BRUSH_SIZE_4: "brushSize4",
  BRUSH_SIZE_5: "brushSize5",

  // Color (1-8)
  COLOR_1: "color1",
  COLOR_2: "color2",
  COLOR_3: "color3",
  COLOR_4: "color4",
  COLOR_5: "color5",
  COLOR_6: "color6",
  COLOR_7: "color7",
  COLOR_8: "color8",
} as const

export type DrawingCommand = (typeof DRAWING_COMMANDS)[keyof typeof DRAWING_COMMANDS]

/**
 * Modifier key state
 */
interface Modifiers {
  readonly ctrl: boolean
  readonly shift: boolean
  readonly alt: boolean
  readonly meta: boolean
}

/**
 * Hotkey binding definition
 */
export interface HotkeyBinding {
  readonly command: DrawingCommand
  readonly key: string
  readonly modifiers: Modifiers
  readonly description: string
}

/**
 * Default hotkey bindings for drawing
 */
const DEFAULT_HOTKEY_BINDINGS: readonly HotkeyBinding[] = [
  // Tools
  {
    command: "toolPencil",
    key: "p",
    modifiers: { ctrl: false, shift: false, alt: false, meta: false },
    description: "Pencil tool",
  },
  {
    command: "toolEraser",
    key: "e",
    modifiers: { ctrl: false, shift: false, alt: false, meta: false },
    description: "Eraser tool",
  },

  // Actions
  {
    command: "undo",
    key: "z",
    modifiers: { ctrl: true, shift: false, alt: false, meta: false },
    description: "Undo",
  },
  {
    command: "redo",
    key: "z",
    modifiers: { ctrl: true, shift: true, alt: false, meta: false },
    description: "Redo",
  },
  {
    command: "redo",
    key: "y",
    modifiers: { ctrl: true, shift: false, alt: false, meta: false },
    description: "Redo (Ctrl+Y)",
  },
  {
    command: "save",
    key: "s",
    modifiers: { ctrl: true, shift: false, alt: false, meta: false },
    description: "Save",
  },
  {
    command: "clear",
    key: "Delete",
    modifiers: { ctrl: true, shift: false, alt: false, meta: false },
    description: "Clear canvas",
  },

  // Brush sizes (1-5 keys)
  {
    command: "brushSize1",
    key: "1",
    modifiers: { ctrl: false, shift: false, alt: false, meta: false },
    description: "Brush size 1",
  },
  {
    command: "brushSize2",
    key: "2",
    modifiers: { ctrl: false, shift: false, alt: false, meta: false },
    description: "Brush size 2",
  },
  {
    command: "brushSize3",
    key: "3",
    modifiers: { ctrl: false, shift: false, alt: false, meta: false },
    description: "Brush size 3",
  },
  {
    command: "brushSize4",
    key: "4",
    modifiers: { ctrl: false, shift: false, alt: false, meta: false },
    description: "Brush size 4",
  },
  {
    command: "brushSize5",
    key: "5",
    modifiers: { ctrl: false, shift: false, alt: false, meta: false },
    description: "Brush size 5",
  },

  // Colors (Shift+1-8)
  {
    command: "color1",
    key: "1",
    modifiers: { ctrl: false, shift: true, alt: false, meta: false },
    description: "Color 1 (Black)",
  },
  {
    command: "color2",
    key: "2",
    modifiers: { ctrl: false, shift: true, alt: false, meta: false },
    description: "Color 2 (Red)",
  },
  {
    command: "color3",
    key: "3",
    modifiers: { ctrl: false, shift: true, alt: false, meta: false },
    description: "Color 3 (Orange)",
  },
  {
    command: "color4",
    key: "4",
    modifiers: { ctrl: false, shift: true, alt: false, meta: false },
    description: "Color 4 (Yellow)",
  },
  {
    command: "color5",
    key: "5",
    modifiers: { ctrl: false, shift: true, alt: false, meta: false },
    description: "Color 5 (Green)",
  },
  {
    command: "color6",
    key: "6",
    modifiers: { ctrl: false, shift: true, alt: false, meta: false },
    description: "Color 6 (Blue)",
  },
  {
    command: "color7",
    key: "7",
    modifiers: { ctrl: false, shift: true, alt: false, meta: false },
    description: "Color 7 (Purple)",
  },
  {
    command: "color8",
    key: "8",
    modifiers: { ctrl: false, shift: true, alt: false, meta: false },
    description: "Color 8 (Pink)",
  },
]

/**
 * Extract modifier state from keyboard event
 */
function getModifiersFromEvent(event: KeyboardEvent): Modifiers {
  return {
    ctrl: event.ctrlKey,
    shift: event.shiftKey,
    alt: event.altKey,
    meta: event.metaKey,
  }
}

/**
 * Check if modifiers match (Mac: Ctrl/Meta are equivalent)
 */
function modifiersMatch(a: Modifiers, b: Modifiers): boolean {
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0

  if (isMac) {
    const aCtrlOrMeta = a.ctrl || a.meta
    const bCtrlOrMeta = b.ctrl || b.meta
    return aCtrlOrMeta === bCtrlOrMeta && a.shift === b.shift && a.alt === b.alt
  }

  return a.ctrl === b.ctrl && a.shift === b.shift && a.alt === b.alt && a.meta === b.meta
}

/**
 * Format hotkey for display
 */
export function formatHotkeyDisplay(binding: HotkeyBinding): string {
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0
  const parts: string[] = []

  if (binding.modifiers.ctrl || binding.modifiers.meta) {
    parts.push(isMac ? "⌘" : "Ctrl")
  }
  if (binding.modifiers.alt) {
    parts.push(isMac ? "⌥" : "Alt")
  }
  if (binding.modifiers.shift) {
    parts.push(isMac ? "⇧" : "Shift")
  }

  const keyDisplay = match(binding.key)
    .with("Delete", () => "Del")
    .with("Backspace", () => "⌫")
    .otherwise((k) => k.toUpperCase())

  parts.push(keyDisplay)

  return parts.join(isMac ? "" : "+")
}

/**
 * Command handler type
 */
export type HotkeyHandler = (command: DrawingCommand) => void

/**
 * Immutable hotkey manager for drawing commands
 */
export class DrawingHotkeyManager {
  private readonly bindings: readonly HotkeyBinding[]
  private readonly handler: HotkeyHandler | null
  private readonly enabled: boolean
  private readonly boundKeydownHandler: ((event: KeyboardEvent) => void) | null
  private readonly targetElement: HTMLElement | null

  private constructor(
    bindings: readonly HotkeyBinding[],
    handler: HotkeyHandler | null,
    enabled: boolean,
    boundHandler: ((event: KeyboardEvent) => void) | null,
    targetElement: HTMLElement | null,
  ) {
    this.bindings = bindings
    this.handler = handler
    this.enabled = enabled
    this.boundKeydownHandler = boundHandler
    this.targetElement = targetElement
  }

  /**
   * Create with default bindings
   */
  static create(): DrawingHotkeyManager {
    return new DrawingHotkeyManager(DEFAULT_HOTKEY_BINDINGS, null, false, null, null)
  }

  /**
   * Set command handler
   */
  setHandler(handler: HotkeyHandler): DrawingHotkeyManager {
    return new DrawingHotkeyManager(
      this.bindings,
      handler,
      this.enabled,
      this.boundKeydownHandler,
      this.targetElement,
    )
  }

  /**
   * Enable hotkeys on a specific element (for scoped handling)
   */
  enable(targetElement?: HTMLElement): DrawingHotkeyManager {
    if (this.enabled || !this.handler) {
      return this
    }

    const handler = this.handler
    const bindings = this.bindings
    const element = targetElement ?? null

    const keydownHandler = (event: KeyboardEvent) => {
      // Skip if in input/textarea (but allow Escape)
      const target = event.target as HTMLElement
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        if (event.key !== "Escape") {
          return
        }
      }

      const eventModifiers = getModifiersFromEvent(event)

      const matchedBinding = bindings.find(
        (binding) =>
          binding.key.toLowerCase() === event.key.toLowerCase() &&
          modifiersMatch(binding.modifiers, eventModifiers),
      )

      if (matchedBinding) {
        event.preventDefault()
        event.stopPropagation()
        handler(matchedBinding.command)
      }
    }

    const listenTarget = element ?? document
    listenTarget.addEventListener("keydown", keydownHandler as EventListener)

    return new DrawingHotkeyManager(bindings, handler, true, keydownHandler, element)
  }

  /**
   * Disable hotkeys
   */
  disable(): DrawingHotkeyManager {
    if (!this.enabled || !this.boundKeydownHandler) {
      return this
    }

    const listenTarget = this.targetElement ?? document
    listenTarget.removeEventListener("keydown", this.boundKeydownHandler as EventListener)

    return new DrawingHotkeyManager(this.bindings, this.handler, false, null, null)
  }

  /**
   * Get all bindings
   */
  getBindings(): readonly HotkeyBinding[] {
    return this.bindings
  }

  /**
   * Get binding for a specific command
   */
  getBindingForCommand(command: DrawingCommand): HotkeyBinding | undefined {
    return this.bindings.find((b) => b.command === command)
  }

  /**
   * Get display string for a command
   */
  getHotkeyDisplayForCommand(command: DrawingCommand): string | undefined {
    const binding = this.getBindingForCommand(command)
    return binding ? formatHotkeyDisplay(binding) : undefined
  }

  /**
   * Check if enabled
   */
  isEnabled(): boolean {
    return this.enabled
  }
}
