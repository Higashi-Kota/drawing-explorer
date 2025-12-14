import { File, Files, Folder } from "lucide-react"
import type React from "react"
import { createPortal } from "react-dom"
import type { TreeNode } from "../../types"

interface DragPreviewProps {
  nodes: readonly TreeNode[]
  position: { x: number; y: number }
}

export const DragPreview: React.FC<DragPreviewProps> = ({ nodes, position }) => {
  if (nodes.length === 0) return null

  const firstNode = nodes[0]
  const count = nodes.length
  const isMultiple = count > 1

  // Count files and folders
  const fileCount = nodes.filter((n) => n.type === "file").length
  const folderCount = nodes.filter((n) => n.type === "folder").length

  const content = (
    <div
      className='fixed pointer-events-none'
      style={{
        left: position.x + 12,
        top: position.y + 8,
        zIndex: 9999,
      }}
    >
      {/* Main preview card */}
      <div
        className='flex items-center gap-2 px-3 py-2 rounded-lg shadow-xl'
        style={{
          backgroundColor: "var(--color-card)",
          border: "1px solid var(--color-border)",
          color: "var(--color-card-foreground)",
          minWidth: "120px",
          maxWidth: "200px",
        }}
      >
        {isMultiple ? (
          // Multiple items view
          <>
            <div
              className='flex items-center justify-center w-8 h-8 rounded-md'
              style={{ backgroundColor: "var(--color-muted)" }}
            >
              <Files size={18} style={{ color: "var(--color-primary)" }} />
            </div>
            <div className='flex flex-col min-w-0'>
              <span className='text-sm font-semibold' style={{ color: "var(--color-foreground)" }}>
                {count} items
              </span>
              <span className='text-xs' style={{ color: "var(--color-muted-foreground)" }}>
                {folderCount > 0 && `${folderCount} folder${folderCount > 1 ? "s" : ""}`}
                {folderCount > 0 && fileCount > 0 && ", "}
                {fileCount > 0 && `${fileCount} file${fileCount > 1 ? "s" : ""}`}
              </span>
            </div>
          </>
        ) : (
          // Single item view
          firstNode && (
            <>
              <span
                style={{
                  color:
                    firstNode.type === "folder"
                      ? "var(--color-base-palette-orange)"
                      : "var(--color-primary)",
                }}
              >
                {firstNode.type === "folder" ? (
                  <Folder size={18} strokeWidth={1.75} />
                ) : (
                  <File size={18} strokeWidth={1.75} />
                )}
              </span>
              <span
                className='text-sm font-medium truncate'
                style={{ color: "var(--color-foreground)" }}
              >
                {firstNode.name}
              </span>
            </>
          )
        )}
      </div>

      {/* Badge showing count for multiple items */}
      {isMultiple && (
        <div
          className='absolute -top-2 -right-2 flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold'
          style={{
            backgroundColor: "var(--color-primary)",
            color: "var(--color-primary-foreground)",
            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
          }}
        >
          {count}
        </div>
      )}
    </div>
  )

  return createPortal(content, document.body)
}
