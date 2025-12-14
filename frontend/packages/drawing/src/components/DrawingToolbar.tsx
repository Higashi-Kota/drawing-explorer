import { Eraser, Pencil, Redo, RotateCcw, Save, Undo } from "lucide-react"
import type { ReactNode } from "react"
import { DRAWING_COMMANDS, type DrawingCommand } from "../core/HotkeyManager"
import { BRUSH_SIZES, type DrawingTool, PALETTE_TOKENS } from "../types"
import { BrushSizeButton } from "./BrushSizeButton"
import { ColorButton } from "./ColorButton"
import { ToolButton } from "./ToolButton"
import { ToolbarDivider } from "./ToolbarDivider"
import { ToolbarGroup } from "./ToolbarGroup"

export interface DrawingToolbarProps {
  /** Currently selected tool */
  currentTool: DrawingTool
  /** Currently selected color (CSS color value) */
  currentColor: string
  /** Currently selected brush size */
  currentBrushSize: number
  /** Available colors (resolved from CSS variables) */
  colors: readonly string[]
  /** Whether canvas has unsaved changes */
  isDirty?: boolean
  /** Whether undo is available */
  canUndo?: boolean
  /** Whether redo is available */
  canRedo?: boolean
  /** Whether strokes exist (for clear button) */
  hasStrokes?: boolean
  /** Callback when tool changes */
  onToolChange?: (tool: DrawingTool) => void
  /** Callback when color changes */
  onColorChange?: (color: string, index: number) => void
  /** Callback when brush size changes */
  onBrushSizeChange?: (size: number) => void
  /** Callback for undo */
  onUndo?: () => void
  /** Callback for redo */
  onRedo?: () => void
  /** Callback for save */
  onSave?: () => void
  /** Callback for clear */
  onClear?: () => void
  /** Function to get hotkey display string */
  getHotkeyDisplay?: (command: DrawingCommand) => string | undefined
  /** Additional toolbar content */
  children?: ReactNode
}

/**
 * Color name lookup for accessibility
 */
const COLOR_NAMES: Record<string, string> = {
  "--color-base-palette-black": "Black",
  "--color-base-palette-red": "Red",
  "--color-base-palette-orange": "Orange",
  "--color-base-palette-yellow": "Yellow",
  "--color-base-palette-green": "Green",
  "--color-base-palette-blue": "Blue",
  "--color-base-palette-purple": "Purple",
  "--color-base-palette-pink": "Pink",
}

/**
 * Drawing toolbar component
 *
 * Provides tool selection, color picker, brush size selector,
 * and action buttons (undo/redo/save/clear).
 *
 * Follows WAI-ARIA toolbar pattern with proper grouping.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/
 */
export function DrawingToolbar({
  currentTool,
  currentColor,
  currentBrushSize,
  colors,
  isDirty = false,
  canUndo = false,
  canRedo = false,
  hasStrokes = false,
  onToolChange,
  onColorChange,
  onBrushSizeChange,
  onUndo,
  onRedo,
  onSave,
  onClear,
  getHotkeyDisplay,
  children,
}: DrawingToolbarProps) {
  const getShortcut = (command: DrawingCommand): string | undefined => {
    return getHotkeyDisplay?.(command)
  }

  return (
    <div
      role='toolbar'
      aria-label='Drawing tools'
      className='grid grid-flow-col auto-cols-max items-center gap-4 px-4 py-2 border-b border-border/50 bg-gradient-to-b from-muted/40 to-muted/20'
    >
      {/* Tool selection */}
      <ToolbarGroup aria-label='Drawing tools'>
        <ToolButton
          icon={<Pencil className='w-4 h-4' />}
          aria-label='Pencil'
          pressed={currentTool === "pencil"}
          shortcut={getShortcut(DRAWING_COMMANDS.TOOL_PENCIL)}
          onClick={() => onToolChange?.("pencil")}
        />
        <ToolButton
          icon={<Eraser className='w-4 h-4' />}
          aria-label='Eraser'
          pressed={currentTool === "eraser"}
          shortcut={getShortcut(DRAWING_COMMANDS.TOOL_ERASER)}
          onClick={() => onToolChange?.("eraser")}
        />
      </ToolbarGroup>

      {/* Color palette */}
      <ToolbarGroup aria-label='Color palette' className='gap-2 px-2'>
        {colors.map((color, index) => {
          const token = PALETTE_TOKENS[index]
          const colorName = token
            ? (COLOR_NAMES[token] ?? `Color ${index + 1}`)
            : `Color ${index + 1}`
          const shortcutCommand = [
            DRAWING_COMMANDS.COLOR_1,
            DRAWING_COMMANDS.COLOR_2,
            DRAWING_COMMANDS.COLOR_3,
            DRAWING_COMMANDS.COLOR_4,
            DRAWING_COMMANDS.COLOR_5,
            DRAWING_COMMANDS.COLOR_6,
            DRAWING_COMMANDS.COLOR_7,
            DRAWING_COMMANDS.COLOR_8,
          ][index]

          return (
            <ColorButton
              key={token ?? index}
              color={color}
              colorName={colorName}
              selected={currentColor === color}
              shortcut={shortcutCommand ? getShortcut(shortcutCommand) : undefined}
              onClick={() => onColorChange?.(color, index)}
            />
          )
        })}
      </ToolbarGroup>

      {/* Brush sizes */}
      <ToolbarGroup aria-label='Brush sizes'>
        {BRUSH_SIZES.map((size, index) => {
          const shortcutCommand = [
            DRAWING_COMMANDS.BRUSH_SIZE_1,
            DRAWING_COMMANDS.BRUSH_SIZE_2,
            DRAWING_COMMANDS.BRUSH_SIZE_3,
            DRAWING_COMMANDS.BRUSH_SIZE_4,
            DRAWING_COMMANDS.BRUSH_SIZE_5,
          ][index]

          return (
            <BrushSizeButton
              key={size}
              size={size}
              selected={currentBrushSize === size}
              shortcut={shortcutCommand ? getShortcut(shortcutCommand) : undefined}
              onClick={() => onBrushSizeChange?.(size)}
            />
          )
        })}
      </ToolbarGroup>

      {/* Spacer */}
      <div className='flex-1' />

      {/* Actions */}
      <ToolbarGroup aria-label='Actions' className='gap-1'>
        {/* Save button - disabled when no unsaved changes */}
        {onSave && (
          <ToolButton
            icon={<Save className='w-4 h-4' />}
            aria-label={isDirty ? "Save (unsaved changes)" : "Save"}
            shortcut={getShortcut(DRAWING_COMMANDS.SAVE)}
            onClick={onSave}
            disabled={!isDirty}
            pressed={isDirty}
          />
        )}

        <ToolbarDivider />

        <ToolButton
          icon={<Undo className='w-4 h-4' />}
          aria-label='Undo'
          shortcut={getShortcut(DRAWING_COMMANDS.UNDO)}
          disabled={!canUndo}
          onClick={onUndo}
        />
        <ToolButton
          icon={<Redo className='w-4 h-4' />}
          aria-label='Redo'
          shortcut={getShortcut(DRAWING_COMMANDS.REDO)}
          disabled={!canRedo}
          onClick={onRedo}
        />

        <ToolbarDivider />

        <ToolButton
          icon={<RotateCcw className='w-4 h-4' />}
          aria-label='Clear canvas'
          variant='destructive'
          shortcut={getShortcut(DRAWING_COMMANDS.CLEAR)}
          disabled={!hasStrokes}
          onClick={onClear}
        />
      </ToolbarGroup>

      {children}
    </div>
  )
}
