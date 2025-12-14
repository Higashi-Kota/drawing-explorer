import type React from "react"
import { useEffect, useRef, useState } from "react"
import { match } from "ts-pattern"

import { DragDropManager } from "../../core/DragDropManager"
import type { FileTreeManager } from "../../core/FileTreeManager"
import type {
  ContextMenuState,
  DropPosition,
  EditingState,
  EditingType,
  TreeNode,
} from "../../types"
import { isRootPath, ROOT_PATH } from "../../types"
import { sortForTreeView } from "../../utils"
import { ContextMenu, getFileContextActions, getFolderContextActions } from "../ContextMenu"
import { DeleteConfirmModal } from "../DeleteConfirmModal"
import { DragPreview } from "../DragPreview"
import { TreeItem, type TreeItemDragCallbacks } from "../TreeItem"

const ROW_HEIGHT = 32

function calculateScrollTop(index: number, totalRows: number, containerHeight: number): number {
  const normalizedIndex = Math.max(0, Math.min(index, totalRows - 1))
  if (normalizedIndex === 0) return 0
  if (normalizedIndex === totalRows - 1) return normalizedIndex * ROW_HEIGHT

  const visibleRows = Math.floor(containerHeight / ROW_HEIGHT)
  const middleOffset = Math.floor(visibleRows / 2) * ROW_HEIGHT
  return Math.max(0, normalizedIndex * ROW_HEIGHT - middleOffset)
}

function collectVisibleNodes(
  node: TreeNode,
  expandedPaths: ReadonlySet<string>,
): readonly TreeNode[] {
  return match(node)
    .with({ type: "file" }, () => [node])
    .with({ type: "folder" }, (folder) => {
      const nodes: TreeNode[] = [folder]
      if (expandedPaths.has(folder.path)) {
        const sortedChildren = sortForTreeView(folder.children)
        for (const child of sortedChildren) {
          nodes.push(...collectVisibleNodes(child, expandedPaths))
        }
      }
      return nodes
    })
    .exhaustive()
}

function getParentPath(path: string): string | null {
  if (isRootPath(path)) return null
  const lastSlashIndex = path.lastIndexOf("/")
  if (lastSlashIndex === -1) return ROOT_PATH
  return path.slice(0, lastSlashIndex)
}

interface TreeViewProps {
  readonly tree: FileTreeManager
  readonly onTreeUpdate: () => void
  readonly onFolderSelect?: (path: string) => void
  readonly onFileSelect?: (path: string) => void
  readonly onSelectionChange?: (selectedPaths: ReadonlySet<string>) => void
  readonly onCreate?: (parentPath: string, name: string, type: "file" | "folder") => void
  readonly onRename?: (path: string, newName: string) => void
  readonly onDelete?: (node: TreeNode) => void
  readonly onMove?: (
    sourcePaths: readonly string[],
    targetPath: string,
    position: DropPosition,
  ) => void
  readonly onOpen?: (node: TreeNode) => void
  readonly externalEditingState?: EditingState | null
  readonly onEditingStateChange?: (state: EditingState | null) => void
}

export const TreeView: React.FC<TreeViewProps> = ({
  tree,
  onTreeUpdate,
  onFolderSelect,
  onFileSelect,
  onSelectionChange,
  onCreate,
  onRename,
  onDelete,
  onMove,
  onOpen,
  externalEditingState,
  onEditingStateChange,
}) => {
  const treeRef = useRef<HTMLUListElement>(null)

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [internalEditingState, setInternalEditingState] = useState<EditingState | null>(null)
  const [dragDropManager, setDragDropManager] = useState(() => DragDropManager.initial())
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TreeNode | null>(null)

  const editingState =
    externalEditingState !== undefined ? externalEditingState : internalEditingState
  const setEditingState = (state: EditingState | null) => {
    if (onEditingStateChange) {
      onEditingStateChange(state)
    } else {
      setInternalEditingState(state)
    }
  }

  const root = tree.root
  const expandedPaths = tree.expandedPaths
  const focusedPath = tree.focusedPath

  const handleToggleExpand = (path: string) => {
    tree.toggleExpansion(path)
    onTreeUpdate()
  }

  const handleSelect = (path: string, event: React.MouseEvent) => {
    const { ctrlKey, metaKey, shiftKey } = event
    const isCtrl = ctrlKey || metaKey
    const isSingleSelect = !shiftKey && !isCtrl

    if (shiftKey) {
      const shouldAddToExisting = isCtrl || tree.isAddMode
      tree.selectRange(path, shouldAddToExisting)
    } else if (isCtrl) {
      tree.toggleSelection(path)
    } else {
      tree.select(path)
    }

    if (isSingleSelect) {
      const node = tree.getNode(path)
      if (node?.type === "folder") {
        onFolderSelect?.(path)
      } else if (node?.type === "file") {
        onFileSelect?.(path)
      }
    }

    onSelectionChange?.(tree.selectedIds)
    onTreeUpdate()
  }

  const visibleNodes = root ? collectVisibleNodes(root, expandedPaths) : []

  const pathToIndex = new Map<string, number>()
  for (let i = 0; i < visibleNodes.length; i++) {
    const node = visibleNodes[i]
    if (node) {
      pathToIndex.set(node.path, i)
    }
  }

  const handleFocus = (path: string) => {
    if (tree.focusedPath === path) return
    tree.setFocusedPath(path)
    onTreeUpdate()
  }

  const moveFocus = (newPath: string) => {
    const element = treeRef.current?.querySelector(`[data-path="${CSS.escape(newPath)}"]`)
    if (element instanceof HTMLElement) {
      element.focus()
    }
    tree.setFocusedPath(newPath)

    const containerEl = document.getElementById("tree-scroll-container")
    if (containerEl) {
      const index = visibleNodes.findIndex((node) => node.path === newPath)
      if (index !== -1) {
        const scrollTop = calculateScrollTop(index, visibleNodes.length, containerEl.clientHeight)
        containerEl.scrollTop = scrollTop
      }
    }

    onTreeUpdate()
  }

  const handleContextMenu = (node: TreeNode, event: React.MouseEvent) => {
    setContextMenu({ node, x: event.clientX, y: event.clientY })
  }

  const closeContextMenu = () => {
    setContextMenu(null)
  }

  const handleContextAction = (actionId: string) => {
    if (!contextMenu) return

    const targetNode = contextMenu.node

    match(actionId)
      .with("newFolder", () => {
        if (targetNode.type === "folder" && !expandedPaths.has(targetNode.path)) {
          tree.expand(targetNode.path)
          onTreeUpdate()
        }
        setEditingState({ path: targetNode.path, type: "newFolder" })
      })
      .with("newFile", () => {
        if (targetNode.type === "folder" && !expandedPaths.has(targetNode.path)) {
          tree.expand(targetNode.path)
          onTreeUpdate()
        }
        setEditingState({ path: targetNode.path, type: "newFile" })
      })
      .with("rename", () => {
        setEditingState({ path: targetNode.path, type: "rename" })
      })
      .with("delete", () => {
        setDeleteTarget(targetNode)
      })
      .with("open", () => {
        onOpen?.(targetNode)
      })
      .otherwise(() => {})

    closeContextMenu()
  }

  const handleEditSubmit = (path: string, name: string, type: EditingType) => {
    match(type)
      .with("rename", () => {
        onRename?.(path, name)
      })
      .with("newFile", () => {
        onCreate?.(path, name, "file")
      })
      .with("newFolder", () => {
        onCreate?.(path, name, "folder")
      })
      .exhaustive()

    setEditingState(null)
    onTreeUpdate()
  }

  const handleEditCancel = () => {
    setEditingState(null)
  }

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      onDelete?.(deleteTarget)
    }
    setDeleteTarget(null)
  }

  const handleDeleteCancel = () => {
    setDeleteTarget(null)
  }

  // Drag & drop handlers
  const handleDragStart = (paths: readonly string[], event: React.DragEvent) => {
    setDragDropManager((prev) => prev.startDrag(paths))
    setMousePosition({ x: event.clientX, y: event.clientY })
  }

  const handleDragOver = (path: string, position: DropPosition, event: React.DragEvent) => {
    event.dataTransfer.dropEffect = "move"

    const isValid = DragDropManager.validateDrop(
      dragDropManager.draggingPaths,
      path,
      position,
      tree.getNode(path)?.type === "folder",
      (p) => tree.getDescendants(p),
    )

    if (isValid) {
      setDragDropManager((prev) => prev.updateDropTarget({ path, position }))
    } else {
      event.dataTransfer.dropEffect = "none"
      setDragDropManager((prev) => prev.updateDropTarget(null))
    }

    setMousePosition({ x: event.clientX, y: event.clientY })
  }

  const handleDragLeave = () => {
    setDragDropManager((prev) => prev.updateDropTarget(null))
  }

  const handleDrop = (targetPath: string, position: DropPosition) => {
    const sourcePaths = dragDropManager.draggingPaths
    if (sourcePaths.length === 0) return

    const isValid = DragDropManager.validateDrop(
      sourcePaths,
      targetPath,
      position,
      tree.getNode(targetPath)?.type === "folder",
      (p) => tree.getDescendants(p),
    )

    if (isValid && onMove) {
      onMove(sourcePaths, targetPath, position)
    }

    setDragDropManager(DragDropManager.initial())
    setMousePosition(null)
  }

  const handleDragEnd = () => {
    setDragDropManager(DragDropManager.initial())
    setMousePosition(null)
  }

  useEffect(() => {
    if (!dragDropManager.isDragging) return undefined

    const handleGlobalMouseUp = () => {
      setDragDropManager(DragDropManager.initial())
      setMousePosition(null)
    }

    const handleGlobalDragEnd = () => {
      setDragDropManager(DragDropManager.initial())
      setMousePosition(null)
    }

    document.addEventListener("mouseup", handleGlobalMouseUp)
    document.addEventListener("dragend", handleGlobalDragEnd)

    return () => {
      document.removeEventListener("mouseup", handleGlobalMouseUp)
      document.removeEventListener("dragend", handleGlobalDragEnd)
    }
  }, [dragDropManager.isDragging])

  const draggingNodes: TreeNode[] = []
  for (const path of dragDropManager.draggingPaths) {
    const node = tree.getNode(path)
    if (node) {
      draggingNodes.push(node)
    }
  }

  const dragCallbacks: TreeItemDragCallbacks | undefined = onMove
    ? {
        onDragStart: handleDragStart,
        onDragOver: handleDragOver,
        onDragLeave: handleDragLeave,
        onDrop: handleDrop,
        onDragEnd: handleDragEnd,
        isPathDragging: (path) => dragDropManager.isPathDragging(path),
        dropTarget: dragDropManager.dropTarget,
        selectedPaths: tree.selectedIds,
      }
    : undefined

  // Keyboard navigation
  const handleTreeKeyDown = (event: React.KeyboardEvent) => {
    if (editingState) return
    if (visibleNodes.length === 0) return

    const activeElement = document.activeElement
    const activePath = activeElement instanceof HTMLElement ? activeElement.dataset.path : null
    const effectivePath = activePath ?? focusedPath
    if (effectivePath === undefined || effectivePath === null) return

    const currentIndex = pathToIndex.get(effectivePath) ?? -1
    if (currentIndex === -1) return

    const currentNode = visibleNodes[currentIndex]
    if (!currentNode) return

    const stopEvent = () => {
      event.preventDefault()
      event.stopPropagation()
      event.nativeEvent.stopImmediatePropagation()
    }

    match(event.key)
      .with("ArrowDown", () => {
        stopEvent()
        const nextNode = visibleNodes[currentIndex + 1]
        if (nextNode) moveFocus(nextNode.path)
      })
      .with("ArrowUp", () => {
        stopEvent()
        const prevNode = visibleNodes[currentIndex - 1]
        if (prevNode) moveFocus(prevNode.path)
      })
      .with("ArrowRight", () => {
        stopEvent()
        if (currentNode.type === "folder") {
          if (!expandedPaths.has(currentNode.path)) {
            handleToggleExpand(currentNode.path)
          } else if (currentNode.children.length > 0) {
            const firstChild = currentNode.children[0]
            if (firstChild) moveFocus(firstChild.path)
          }
        }
      })
      .with("ArrowLeft", () => {
        stopEvent()
        if (currentNode.type === "folder" && expandedPaths.has(currentNode.path)) {
          handleToggleExpand(currentNode.path)
        } else {
          const parentPath = getParentPath(currentNode.path)
          if (parentPath !== null) moveFocus(parentPath)
        }
      })
      .with("Home", () => {
        stopEvent()
        const firstNode = visibleNodes[0]
        if (firstNode) moveFocus(firstNode.path)
      })
      .with("End", () => {
        stopEvent()
        const lastNode = visibleNodes[visibleNodes.length - 1]
        if (lastNode) moveFocus(lastNode.path)
      })
      .with("Enter", () => {
        stopEvent()
        tree.select(currentNode.path)
        if (currentNode.type === "folder") {
          onFolderSelect?.(currentNode.path)
        } else {
          onFileSelect?.(currentNode.path)
          onOpen?.(currentNode)
        }
        onSelectionChange?.(tree.selectedIds)
        onTreeUpdate()
      })
      .with(" ", () => {
        stopEvent()
        tree.toggleSelection(currentNode.path)
        onSelectionChange?.(tree.selectedIds)
        onTreeUpdate()
      })
      .with("Delete", () => {
        stopEvent()
        if (!isRootPath(currentNode.path)) {
          setDeleteTarget(currentNode)
        }
      })
      .with("F2", () => {
        stopEvent()
        if (!isRootPath(currentNode.path)) {
          setEditingState({ path: currentNode.path, type: "rename" })
        }
      })
      .with("*", () => {
        stopEvent()
        tree.expandSiblings(currentNode.path)
        onTreeUpdate()
      })
      .otherwise(() => {
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          stopEvent()
          const char = event.key.toLowerCase()
          for (let i = 1; i <= visibleNodes.length; i++) {
            const index = (currentIndex + i) % visibleNodes.length
            const node = visibleNodes[index]
            if (node?.name.toLowerCase().startsWith(char)) {
              moveFocus(node.path)
              break
            }
          }
        }
      })
  }

  const renderNode = (
    node: TreeNode,
    level: number,
    setSize: number,
    posInSet: number,
  ): React.ReactNode => {
    const isExpanded = expandedPaths.has(node.path)
    const isSelected = tree.isSelected(node.path)
    const isFocused = focusedPath === node.path

    return match(node)
      .with({ type: "folder" }, (folder) => (
        <TreeItem
          key={folder.path || "root"}
          node={folder}
          isExpanded={isExpanded}
          isSelected={isSelected}
          isFocused={isFocused}
          level={level}
          setSize={setSize}
          posInSet={posInSet}
          editingState={editingState}
          onToggleExpand={handleToggleExpand}
          onSelect={handleSelect}
          onFocus={handleFocus}
          onContextMenu={handleContextMenu}
          onEditSubmit={handleEditSubmit}
          onEditCancel={handleEditCancel}
          dragCallbacks={dragCallbacks}
        >
          {sortForTreeView(folder.children).map((child, index) =>
            renderNode(child, level + 1, folder.children.length, index + 1),
          )}
        </TreeItem>
      ))
      .with({ type: "file" }, (file) => (
        <TreeItem
          key={file.path}
          node={file}
          isExpanded={false}
          isSelected={isSelected}
          isFocused={isFocused}
          level={level}
          setSize={setSize}
          posInSet={posInSet}
          editingState={editingState}
          onToggleExpand={handleToggleExpand}
          onSelect={handleSelect}
          onFocus={handleFocus}
          onContextMenu={handleContextMenu}
          onEditSubmit={handleEditSubmit}
          onEditCancel={handleEditCancel}
          dragCallbacks={dragCallbacks}
        />
      ))
      .exhaustive()
  }

  if (!root) {
    return (
      <div className='flex-1 flex items-center justify-center text-muted-foreground text-sm'>
        Loading...
      </div>
    )
  }

  return (
    <>
      <nav aria-label='File tree'>
        {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: Tree widget requires keyboard navigation on ul with role="tree" per WAI-ARIA tree pattern */}
        <ul ref={treeRef} aria-label='File explorer' onKeyDown={handleTreeKeyDown}>
          {renderNode(root, 1, 1, 1)}
        </ul>
      </nav>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          actions={
            contextMenu.node.type === "folder"
              ? getFolderContextActions(isRootPath(contextMenu.node.path))
              : getFileContextActions()
          }
          onAction={handleContextAction}
          onClose={closeContextMenu}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          node={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}

      {dragDropManager.isDragging && mousePosition && draggingNodes.length > 0 && (
        <DragPreview nodes={draggingNodes} position={mousePosition} />
      )}
    </>
  )
}
