import type React from "react"
import { useEffect, useRef } from "react"

export interface ContextMenuAction {
  readonly id: string
  readonly label: string
  readonly icon?: React.ReactNode
  readonly separator?: boolean
  readonly disabled?: boolean
}

interface ContextMenuProps {
  x: number
  y: number
  actions: readonly ContextMenuAction[]
  onAction: (actionId: string) => void
  onClose: () => void
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, actions, onAction, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [onClose])

  // Adjust position to stay within viewport
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      if (rect.right > viewportWidth) {
        menuRef.current.style.left = `${viewportWidth - rect.width - 8}px`
      }
      if (rect.bottom > viewportHeight) {
        menuRef.current.style.top = `${viewportHeight - rect.height - 8}px`
      }
    }
  }, [])

  const handleAction = (actionId: string) => {
    onAction(actionId)
    onClose()
  }

  return (
    <div
      ref={menuRef}
      className='fixed z-50 min-w-35 py-0.5 rounded-md shadow-lg'
      style={{
        left: x,
        top: y,
        backgroundColor: "var(--color-popover)",
        color: "var(--color-popover-foreground)",
        border: "1px solid var(--color-border)",
      }}
      role='menu'
    >
      {actions.map((action) =>
        action.separator ? (
          <div
            key={action.id}
            className='h-px'
            style={{ backgroundColor: "var(--color-border)" }}
          />
        ) : (
          <button
            key={action.id}
            type='button'
            onClick={() => handleAction(action.id)}
            disabled={action.disabled}
            className='w-full flex items-center gap-2 px-2.5 py-1 text-sm text-left disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90'
            style={{ backgroundColor: "transparent" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--color-accent)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent"
            }}
            role='menuitem'
          >
            {action.icon && <span className='w-4 h-4'>{action.icon}</span>}
            <span>{action.label}</span>
          </button>
        ),
      )}
    </div>
  )
}

/**
 * Default context menu actions for folders
 */
export function getFolderContextActions(isRoot = false): ContextMenuAction[] {
  const actions: ContextMenuAction[] = [
    { id: "newFile", label: "New File" },
    { id: "newFolder", label: "New Folder" },
  ]

  if (!isRoot) {
    actions.push(
      { id: "separator1", label: "", separator: true },
      { id: "rename", label: "Rename" },
      { id: "delete", label: "Delete" },
    )
  }

  return actions
}

/**
 * Default context menu actions for files
 */
export function getFileContextActions(): ContextMenuAction[] {
  return [
    { id: "open", label: "Open" },
    { id: "separator1", label: "", separator: true },
    { id: "rename", label: "Rename" },
    { id: "delete", label: "Delete" },
  ]
}
