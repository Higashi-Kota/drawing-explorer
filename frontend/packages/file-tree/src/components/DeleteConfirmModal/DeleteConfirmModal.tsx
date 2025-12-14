import { AlertTriangle } from "lucide-react"
import type React from "react"
import { useEffect, useRef } from "react"
import type { TreeNode } from "../../types"

interface DeleteConfirmModalProps {
  node: TreeNode
  onConfirm: () => void
  onCancel: () => void
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  node,
  onConfirm,
  onCancel,
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    cancelRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [onCancel])

  const isFolder = node.type === "folder"
  const itemType = isFolder ? "folder" : "file"
  const hasChildren = isFolder && node.children.length > 0

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center p-4'
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
    >
      <div
        className='rounded-lg shadow-xl w-full mx-4'
        style={{
          maxWidth: "24rem",
          padding: "1.25rem",
          backgroundColor: "var(--color-card)",
          color: "var(--color-card-foreground)",
          border: "1px solid var(--color-border)",
        }}
        role='dialog'
        aria-labelledby='delete-confirm-title'
        aria-describedby='delete-confirm-description'
      >
        <div className='grid grid-cols-[auto_1fr] gap-4'>
          <div
            className='w-10 h-10 rounded-full grid place-items-center'
            style={{ backgroundColor: "var(--color-destructive-muted)" }}
          >
            <AlertTriangle className='w-5 h-5' style={{ color: "var(--color-destructive)" }} />
          </div>
          <div className='grid gap-2'>
            <h3
              id='delete-confirm-title'
              className='text-lg font-semibold'
              style={{ color: "var(--color-foreground)" }}
            >
              Delete {itemType}
            </h3>
            <div
              id='delete-confirm-description'
              className='grid gap-1 text-sm'
              style={{ color: "var(--color-muted-foreground)" }}
            >
              <span>
                Are you sure you want to delete <strong>"{node.name}"</strong>?
              </span>
              {hasChildren && (
                <span style={{ color: "var(--color-destructive)" }}>
                  This folder contains {node.children.length} item(s) that will also be deleted.
                </span>
              )}
              <span>This action cannot be undone.</span>
            </div>
          </div>
        </div>

        <div className='pt-5 flex justify-end gap-2'>
          <button
            ref={cancelRef}
            type='button'
            onClick={onCancel}
            className='px-3 py-1.5 text-sm font-medium rounded-md transition-colors'
            style={{
              backgroundColor: "var(--color-background)",
              color: "var(--color-foreground)",
              border: "1px solid var(--color-border)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--color-muted)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--color-background)"
            }}
          >
            Cancel
          </button>
          <button
            type='button'
            onClick={onConfirm}
            className='px-3 py-1.5 text-sm font-medium rounded-md transition-colors'
            style={{
              backgroundColor: "var(--color-destructive)",
              color: "var(--color-destructive-foreground)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--color-destructive-hover)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--color-destructive)"
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
