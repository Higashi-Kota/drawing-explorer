import { useCallback, useEffect, useRef } from "react"
import { DRAWING_COMMANDS, type DrawingCommand, DrawingHotkeyManager } from "../core/HotkeyManager"
import { BRUSH_SIZES, type DrawingTool } from "../types"

/**
 * Hotkey action handlers
 */
export interface DrawingHotkeyActions {
  onUndo?: () => void
  onRedo?: () => void
  onSave?: () => void
  onClear?: () => void
  onToolChange?: (tool: DrawingTool) => void
  onBrushSizeChange?: (size: number) => void
  onColorChange?: (colorIndex: number) => void
}

/**
 * Hook options
 */
export interface UseDrawingHotkeysOptions {
  /** Whether hotkeys are enabled */
  enabled?: boolean
  /** Target element for scoped hotkeys (defaults to document) */
  targetRef?: React.RefObject<HTMLElement | null>
}

/**
 * React hook for drawing keyboard shortcuts
 *
 * Manages hotkey binding lifecycle and provides scoped handling.
 */
export function useDrawingHotkeys(
  actions: DrawingHotkeyActions,
  options: UseDrawingHotkeysOptions = {},
): {
  getHotkeyDisplay: (command: DrawingCommand) => string | undefined
} {
  const { enabled = true, targetRef } = options
  const managerRef = useRef<DrawingHotkeyManager>(DrawingHotkeyManager.create())

  // Stable action refs to avoid re-binding
  const actionsRef = useRef(actions)
  actionsRef.current = actions

  const handleCommand = useCallback((command: DrawingCommand) => {
    const { onUndo, onRedo, onSave, onClear, onToolChange, onBrushSizeChange, onColorChange } =
      actionsRef.current

    switch (command) {
      case DRAWING_COMMANDS.UNDO:
        onUndo?.()
        break
      case DRAWING_COMMANDS.REDO:
        onRedo?.()
        break
      case DRAWING_COMMANDS.SAVE:
        onSave?.()
        break
      case DRAWING_COMMANDS.CLEAR:
        onClear?.()
        break
      case DRAWING_COMMANDS.TOOL_PENCIL:
        onToolChange?.("pencil")
        break
      case DRAWING_COMMANDS.TOOL_ERASER:
        onToolChange?.("eraser")
        break
      case DRAWING_COMMANDS.BRUSH_SIZE_1:
        onBrushSizeChange?.(BRUSH_SIZES[0])
        break
      case DRAWING_COMMANDS.BRUSH_SIZE_2:
        onBrushSizeChange?.(BRUSH_SIZES[1])
        break
      case DRAWING_COMMANDS.BRUSH_SIZE_3:
        onBrushSizeChange?.(BRUSH_SIZES[2])
        break
      case DRAWING_COMMANDS.BRUSH_SIZE_4:
        onBrushSizeChange?.(BRUSH_SIZES[3])
        break
      case DRAWING_COMMANDS.BRUSH_SIZE_5:
        onBrushSizeChange?.(BRUSH_SIZES[4])
        break
      case DRAWING_COMMANDS.COLOR_1:
        onColorChange?.(0)
        break
      case DRAWING_COMMANDS.COLOR_2:
        onColorChange?.(1)
        break
      case DRAWING_COMMANDS.COLOR_3:
        onColorChange?.(2)
        break
      case DRAWING_COMMANDS.COLOR_4:
        onColorChange?.(3)
        break
      case DRAWING_COMMANDS.COLOR_5:
        onColorChange?.(4)
        break
      case DRAWING_COMMANDS.COLOR_6:
        onColorChange?.(5)
        break
      case DRAWING_COMMANDS.COLOR_7:
        onColorChange?.(6)
        break
      case DRAWING_COMMANDS.COLOR_8:
        onColorChange?.(7)
        break
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      managerRef.current = managerRef.current.disable()
      return
    }

    const targetElement = targetRef?.current ?? undefined
    managerRef.current = managerRef.current.setHandler(handleCommand).enable(targetElement)

    return () => {
      managerRef.current = managerRef.current.disable()
    }
  }, [enabled, handleCommand, targetRef])

  const getHotkeyDisplay = useCallback((command: DrawingCommand) => {
    return managerRef.current.getHotkeyDisplayForCommand(command)
  }, [])

  return { getHotkeyDisplay }
}
