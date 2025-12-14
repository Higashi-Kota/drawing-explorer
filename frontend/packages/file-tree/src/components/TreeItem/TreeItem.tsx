import { ChevronRight, File, Folder, FolderOpen } from "lucide-react"
import type React from "react"
import { useRef } from "react"
import { match } from "ts-pattern"

import { DragDropManager } from "../../core/DragDropManager"
import type { DropPosition, EditingState, EditingType, TreeNode } from "../../types"
import { formatFileSize } from "../../utils"
import { DropIndicator } from "../DropIndicator"
import { InlineInput } from "../InlineInput"

export interface TreeItemDragCallbacks {
  readonly onDragStart: (paths: readonly string[], event: React.DragEvent) => void
  readonly onDragOver: (path: string, position: DropPosition, event: React.DragEvent) => void
  readonly onDragLeave: (event: React.DragEvent) => void
  readonly onDrop: (targetPath: string, position: DropPosition, event: React.DragEvent) => void
  readonly onDragEnd: () => void
  readonly isPathDragging: (path: string) => boolean
  readonly dropTarget: { path: string; position: DropPosition } | null
  readonly selectedPaths: ReadonlySet<string>
}

interface TreeItemProps {
  readonly node: TreeNode
  readonly isExpanded: boolean
  readonly isSelected: boolean
  readonly isFocused: boolean
  readonly level: number
  readonly setSize: number
  readonly posInSet: number
  readonly editingState: EditingState | null
  readonly onToggleExpand: (path: string) => void
  readonly onSelect: (path: string, event: React.MouseEvent) => void
  readonly onFocus: (path: string) => void
  readonly onContextMenu: (node: TreeNode, event: React.MouseEvent) => void
  readonly onEditSubmit: (path: string, name: string, type: EditingType) => void
  readonly onEditCancel: () => void
  readonly children?: React.ReactNode
  readonly dragCallbacks?: TreeItemDragCallbacks
}

export const TreeItem: React.FC<TreeItemProps> = ({
  node,
  isExpanded,
  isSelected,
  isFocused,
  level,
  setSize,
  posInSet,
  editingState,
  onToggleExpand,
  onSelect,
  onFocus,
  onContextMenu,
  onEditSubmit,
  onEditCancel,
  children,
  dragCallbacks,
}) => {
  const itemRef = useRef<HTMLLIElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const isFolder = node.type === "folder"

  const isEditing = editingState?.path === node.path && editingState?.type === "rename"
  const isCreatingChild =
    editingState?.path === node.path &&
    (editingState?.type === "newFile" || editingState?.type === "newFolder")

  const isDragging = dragCallbacks?.isPathDragging(node.path) ?? false
  const isDropTarget = dragCallbacks?.dropTarget?.path === node.path
  const dropPosition = isDropTarget ? dragCallbacks?.dropTarget?.position : null

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation()
    if (isEditing) return
    itemRef.current?.focus()
    onSelect(node.path, event)
  }

  const handleChevronClick = (event: React.MouseEvent) => {
    event.stopPropagation()
    if (isFolder) {
      onToggleExpand(node.path)
    }
  }

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    onContextMenu(node, event)
  }

  const handleEditSubmit = (name: string) => {
    if (editingState) {
      onEditSubmit(node.path, name, editingState.type)
    }
  }

  // Drag & Drop handlers
  const handleDragStart = (event: React.DragEvent) => {
    if (!dragCallbacks || isEditing) return

    event.stopPropagation()

    const selectedPaths = dragCallbacks.selectedPaths
    const pathsToDrag = selectedPaths.has(node.path) ? [...selectedPaths] : [node.path]

    event.dataTransfer.setData("application/x-file-tree-paths", JSON.stringify(pathsToDrag))
    event.dataTransfer.effectAllowed = "move"

    const emptyImg = new Image()
    emptyImg.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
    event.dataTransfer.setDragImage(emptyImg, 0, 0)

    dragCallbacks.onDragStart(pathsToDrag, event)
  }

  const handleDragOver = (event: React.DragEvent) => {
    if (!dragCallbacks) return

    event.preventDefault()
    event.stopPropagation()

    const rect = contentRef.current?.getBoundingClientRect()
    if (!rect) return

    const position = DragDropManager.calculateDropPosition(event.clientY, rect, isFolder)
    dragCallbacks.onDragOver(node.path, position, event)
  }

  const handleDragLeave = (event: React.DragEvent) => {
    if (!dragCallbacks) return
    event.stopPropagation()
    dragCallbacks.onDragLeave(event)
  }

  const handleDrop = (event: React.DragEvent) => {
    if (!dragCallbacks) return

    event.preventDefault()
    event.stopPropagation()

    const rect = contentRef.current?.getBoundingClientRect()
    if (!rect) return

    const position = DragDropManager.calculateDropPosition(event.clientY, rect, isFolder)
    dragCallbacks.onDrop(node.path, position, event)
  }

  const handleDragEnd = () => {
    dragCallbacks?.onDragEnd()
  }

  const Icon = isFolder ? (isExpanded ? FolderOpen : Folder) : File

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: Tree item uses native drag-and-drop which handles keyboard via treeitem role and tabIndex
    <li
      ref={itemRef}
      role='treeitem'
      aria-expanded={isFolder ? isExpanded : undefined}
      aria-selected={isSelected}
      aria-level={level}
      aria-setsize={setSize}
      aria-posinset={posInSet}
      tabIndex={isFocused ? 0 : -1}
      data-path={node.path}
      draggable={dragCallbacks !== undefined && !isEditing}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onFocus={(e) => {
        e.stopPropagation()
        onFocus(node.path)
      }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`outline-none select-none ${isDragging ? "opacity-50" : ""}`}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: Presentation div handles drag-over positioning, parent li has treeitem role */}
      <div
        ref={contentRef}
        role='presentation'
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          group flex items-center gap-1.5 h-8 px-2 rounded-md relative
          transition-all duration-150
          ${isSelected && dropPosition !== "inside" ? "bg-primary/15 text-foreground" : ""}
          ${!isSelected && dropPosition !== "inside" ? "hover:bg-muted" : ""}
          ${isFocused ? "ring-2 ring-inset ring-ring/70" : ""}
        `}
        style={{
          paddingLeft: `${level * 16 + 8}px`,
          ...(dropPosition === "inside"
            ? {
                backgroundColor:
                  "color-mix(in oklch, var(--color-drop-indicator) 15%, transparent)",
                boxShadow: "inset 0 0 0 2px var(--color-drop-indicator)",
                borderRadius: "0.375rem",
              }
            : {}),
        }}
      >
        {dropPosition && dropPosition !== "inside" && (
          <DropIndicator position={dropPosition} indent={level * 16 + 8} />
        )}

        {isFolder && (
          <button
            type='button'
            onClick={handleChevronClick}
            className='shrink-0 w-4 h-4 flex items-center justify-center text-muted-foreground hover:text-foreground rounded transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
            aria-label={isExpanded ? "Collapse" : "Expand"}
            tabIndex={-1}
          >
            <span
              className={`transform transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`}
            >
              <ChevronRight size={14} strokeWidth={2} />
            </span>
          </button>
        )}

        <span
          className={`shrink-0 transition-transform duration-150 group-hover:scale-105 ${
            isFolder ? "text-amber-500" : "text-primary"
          }`}
        >
          <Icon size={16} strokeWidth={1.75} />
        </span>

        {isEditing ? (
          <InlineInput
            initialValue={node.name}
            onSubmit={handleEditSubmit}
            onCancel={onEditCancel}
            placeholder='Enter name'
          />
        ) : (
          <span className='flex-1 truncate text-sm font-medium'>{node.name}</span>
        )}

        {!isEditing &&
          match(node)
            .with({ type: "file" }, (file) => (
              <span className='text-[11px] text-muted-foreground font-mono opacity-70 group-hover:opacity-100 transition-opacity'>
                {formatFileSize(file.data.size)}
              </span>
            ))
            .with({ type: "folder" }, (folder) => (
              <span className='text-[10px] text-muted-foreground bg-muted/80 px-1.5 py-0.5 rounded-full font-medium opacity-70 group-hover:opacity-100 transition-opacity'>
                {folder.children.length}
              </span>
            ))
            .exhaustive()}
      </div>

      {isCreatingChild && isExpanded && (
        <div
          className='flex items-center gap-1.5 h-8 px-2 rounded-md bg-muted/80 overflow-hidden'
          style={{ paddingLeft: `${(level + 1) * 16 + 8}px` }}
        >
          {editingState?.type === "newFolder" && (
            <span className='shrink-0 w-4 flex items-center justify-center text-muted-foreground opacity-50'>
              <ChevronRight size={14} strokeWidth={2} />
            </span>
          )}
          <span
            className={`shrink-0 opacity-60 ${editingState?.type === "newFolder" ? "text-amber-500" : "text-primary"}`}
          >
            {editingState?.type === "newFolder" ? (
              <Folder size={16} strokeWidth={1.75} />
            ) : (
              <File size={16} strokeWidth={1.75} />
            )}
          </span>
          <InlineInput
            initialValue=''
            onSubmit={handleEditSubmit}
            onCancel={onEditCancel}
            placeholder={editingState?.type === "newFolder" ? "Folder name" : "File name"}
          />
        </div>
      )}

      {/* biome-ignore lint/a11y/useSemanticElements: role="group" is required for nested tree structure per WAI-ARIA tree pattern */}
      {isFolder && isExpanded && children && <ul role='group'>{children}</ul>}
    </li>
  )
}
