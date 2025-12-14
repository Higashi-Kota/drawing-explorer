import { match } from "ts-pattern"
import type { FileData, FileNode, FolderNode, TreeNode } from "../types"

/**
 * FileTreeManager - Mutable tree structure management class
 *
 * Manages selection and expansion state internally with O(1) access.
 * After state changes, use the onTreeUpdate callback to sync with React state.
 *
 * @template T - File node data type (default: FileData)
 */
export class FileTreeManager<T = FileData> {
  private _root: FolderNode<T> | null
  private readonly _fileIndex: Map<string, FileNode<T>>
  private readonly _folderIndex: Map<string, FolderNode<T>>

  // Selection state management (multi-select support)
  private readonly _selectedIds: Set<string>
  private _anchorId: string | null
  private _lastSelectedId: string | null
  private _isAddMode: boolean

  // Expansion state management (path as key)
  private readonly _expandedPaths: Set<string>

  // Focus state management
  private _focusedPath: string | null

  constructor(root: FolderNode<T> | null = null) {
    this._root = root
    this._fileIndex = new Map()
    this._folderIndex = new Map()
    this._selectedIds = new Set()
    this._anchorId = null
    this._lastSelectedId = null
    this._isAddMode = false
    this._expandedPaths = new Set()
    this._focusedPath = null

    if (root) {
      this.buildIndices(root)
    }
  }

  /**
   * Factory for creating empty manager
   */
  static empty<U = FileData>(): FileTreeManager<U> {
    return new FileTreeManager<U>(null)
  }

  /**
   * Set root node and rebuild indices
   */
  setRoot(root: FolderNode<T>): void {
    this._root = root
    this._fileIndex.clear()
    this._folderIndex.clear()
    this.buildIndices(root)
  }

  get root(): FolderNode<T> | null {
    return this._root
  }

  // ==========================================
  // Index Management
  // ==========================================

  private buildIndices(node: TreeNode<T>): void {
    match(node)
      .with({ type: "file" }, (file) => {
        this._fileIndex.set(file.path, file)
      })
      .with({ type: "folder" }, (folder) => {
        this._folderIndex.set(folder.path, folder)
        for (const child of folder.children) {
          this.buildIndices(child)
        }
      })
      .exhaustive()
  }

  getFile(path: string): FileNode<T> | undefined {
    return this._fileIndex.get(path)
  }

  getFolder(path: string): FolderNode<T> | undefined {
    return this._folderIndex.get(path)
  }

  getNode(path: string): TreeNode<T> | undefined {
    return this._fileIndex.get(path) ?? this._folderIndex.get(path)
  }

  /**
   * Add a file to the tree
   * @param file - The file node to add
   * @param parentPath - The parent folder path (empty string for root)
   */
  addFile(file: FileNode<T>, parentPath: string): void {
    const parent = parentPath === "" ? this._root : this.getFolder(parentPath)
    if (!parent) return // Add to parent's children (cast to mutable array for internal mutation)
    ;(parent.children as TreeNode<T>[]).push(file)

    // Add to file index
    this._fileIndex.set(file.path, file)
  }

  /**
   * Remove a file from the tree
   * @param path - The file path to remove
   */
  removeFile(path: string): void {
    const file = this._fileIndex.get(path)
    if (!file) return

    // Find parent folder
    const parentPath = this.getParentPath(path)
    const parent = parentPath ? this.getFolder(parentPath) : this._root

    if (parent) {
      const index = parent.children.findIndex((c) => c.path === path)
      if (index !== -1) {
        // Cast to mutable array for internal mutation
        ;(parent.children as TreeNode<T>[]).splice(index, 1)
      }
    }

    // Remove from index
    this._fileIndex.delete(path)

    // Clear selection if removed file was selected
    if (this._selectedIds.has(path)) {
      this._selectedIds.delete(path)
    }
  }

  // ==========================================
  // Selection State Management
  // ==========================================

  /**
   * Single select: Clear existing selection and select new
   */
  select(path: string): void {
    this._selectedIds.clear()
    this._selectedIds.add(path)
    this._anchorId = path
    this._lastSelectedId = path
    this._isAddMode = false
  }

  /**
   * Toggle selection (Ctrl/Cmd+click)
   */
  toggleSelection(path: string): boolean {
    if (this._selectedIds.has(path)) {
      this._selectedIds.delete(path)
      this._anchorId = path
      this._lastSelectedId = path
      this._isAddMode = true
      return false
    }
    this._selectedIds.add(path)
    this._anchorId = path
    this._lastSelectedId = path
    this._isAddMode = true
    return true
  }

  /**
   * Add to selection (for multi-select)
   */
  addToSelection(path: string): void {
    this._selectedIds.add(path)
    this._lastSelectedId = path
  }

  /**
   * Range selection (Shift+click)
   */
  selectRange(targetPath: string, addToExisting = false): void {
    if (!this._anchorId) {
      this.select(targetPath)
      return
    }

    const visibleNodes = this.getVisibleNodes()
    const anchorIndex = visibleNodes.findIndex((n) => n.path === this._anchorId)
    const targetIndex = visibleNodes.findIndex((n) => n.path === targetPath)

    if (anchorIndex === -1 || targetIndex === -1) {
      this.select(targetPath)
      return
    }

    const startIndex = Math.min(anchorIndex, targetIndex)
    const endIndex = Math.max(anchorIndex, targetIndex)

    if (!addToExisting) {
      this._selectedIds.clear()
      this._isAddMode = false
    } else {
      this._isAddMode = true
    }

    for (let i = startIndex; i <= endIndex; i++) {
      const node = visibleNodes[i]
      if (node) {
        this._selectedIds.add(node.path)
      }
    }

    this._lastSelectedId = targetPath
  }

  clearSelection(): void {
    this._selectedIds.clear()
    this._anchorId = null
    this._lastSelectedId = null
    this._isAddMode = false
  }

  get isAddMode(): boolean {
    return this._isAddMode
  }

  isSelected(path: string): boolean {
    return this._selectedIds.has(path)
  }

  get selectedIds(): ReadonlySet<string> {
    return this._selectedIds
  }

  get selectionCount(): number {
    return this._selectedIds.size
  }

  get selectedPath(): string | null {
    if (this._selectedIds.size === 0) return null
    return this._selectedIds.values().next().value ?? null
  }

  getSelectedNodes(): readonly TreeNode<T>[] {
    const nodes: TreeNode<T>[] = []
    for (const path of this._selectedIds) {
      const node = this.getNode(path)
      if (node) {
        nodes.push(node)
      }
    }
    return nodes
  }

  get anchorId(): string | null {
    return this._anchorId
  }

  get lastSelectedId(): string | null {
    return this._lastSelectedId
  }

  // ==========================================
  // Expansion State Management
  // ==========================================

  toggleExpansion(path: string): boolean {
    if (this._expandedPaths.has(path)) {
      this._expandedPaths.delete(path)
      return false
    }
    this._expandedPaths.add(path)
    return true
  }

  expand(path: string): void {
    this._expandedPaths.add(path)
  }

  collapse(path: string): void {
    this._expandedPaths.delete(path)
  }

  expandAll(): void {
    if (!this._root) return
    for (const p of this.collectFolderPaths(this._root)) {
      this._expandedPaths.add(p)
    }
  }

  collapseAll(): void {
    this._expandedPaths.clear()
  }

  expandSiblings(path: string): void {
    const node = this.getNode(path)
    if (!node) return

    const parentPath = this.getParentPath(path)
    const parent = parentPath ? this.getFolder(parentPath) : this._root

    if (!parent) return

    for (const child of parent.children) {
      if (child.type === "folder") {
        this._expandedPaths.add(child.path)
      }
    }
  }

  private getParentPath(path: string): string | null {
    const lastSlashIndex = path.lastIndexOf("/")
    if (lastSlashIndex <= 0) return null
    return path.slice(0, lastSlashIndex)
  }

  isExpanded(path: string): boolean {
    return this._expandedPaths.has(path)
  }

  get expandedPaths(): ReadonlySet<string> {
    return this._expandedPaths
  }

  // ==========================================
  // Focus State Management
  // ==========================================

  setFocusedPath(path: string | null): void {
    this._focusedPath = path
  }

  get focusedPath(): string | null {
    return this._focusedPath
  }

  isFocused(path: string): boolean {
    return this._focusedPath === path
  }

  // ==========================================
  // Utilities
  // ==========================================

  getVisibleNodes(): readonly TreeNode<T>[] {
    if (!this._root) return []
    return this.collectVisibleNodes(this._root)
  }

  getFiles(folder: FolderNode<T>): readonly FileNode<T>[] {
    return folder.children.filter((child): child is FileNode<T> => child.type === "file")
  }

  getSubfolders(folder: FolderNode<T>): readonly FolderNode<T>[] {
    return folder.children.filter((child): child is FolderNode<T> => child.type === "folder")
  }

  getDescendants(path: string): readonly string[] {
    const node = this.getNode(path)
    if (!node || node.type === "file") {
      return []
    }
    return this.collectDescendantPaths(node)
  }

  getSelfAndDescendants(path: string): readonly string[] {
    return [path, ...this.getDescendants(path)]
  }

  /**
   * Move a node to a new location in the tree
   * @param sourcePath - The path of the node to move
   * @param targetPath - The path of the target location
   * @param position - Where to place relative to target: "before", "after", or "inside" (for folders)
   */
  moveNode(
    sourcePath: string,
    targetPath: string,
    position: "before" | "after" | "inside",
  ): boolean {
    const sourceNode = this.getNode(sourcePath)
    const targetNode = this.getNode(targetPath)
    if (!sourceNode || !targetNode) return false

    // Cannot move a node into itself or its descendants
    if (sourcePath === targetPath || this.getSelfAndDescendants(sourcePath).includes(targetPath)) {
      return false
    }

    // Remove from current location
    const sourceParentPath = this.getParentPath(sourcePath)
    const sourceParent = sourceParentPath ? this.getFolder(sourceParentPath) : this._root
    if (!sourceParent) return false

    const sourceIndex = sourceParent.children.findIndex((c) => c.path === sourcePath)
    if (sourceIndex === -1) return false

    // Remove the node from source
    const [removedNode] = (sourceParent.children as TreeNode<T>[]).splice(sourceIndex, 1)
    if (!removedNode) return false

    // Determine target parent and index
    let targetParent: FolderNode<T> | null
    let insertIndex: number

    if (position === "inside") {
      // Insert as child of target (must be a folder)
      if (targetNode.type !== "folder") return false
      targetParent = targetNode
      insertIndex = 0 // Insert at the beginning
    } else {
      // Insert before or after target
      const targetParentPath = this.getParentPath(targetPath)
      targetParent = targetParentPath ? (this.getFolder(targetParentPath) ?? null) : this._root
      if (!targetParent) return false

      const targetIndex = targetParent.children.findIndex((c) => c.path === targetPath)
      if (targetIndex === -1) return false

      insertIndex = position === "before" ? targetIndex : targetIndex + 1
    }

    // Calculate new parent path
    const newParentPath = targetParent.path

    // Update the node's path and depth
    const updatePaths = (node: TreeNode<T>, parentPath: string, depth: number): TreeNode<T> => {
      const nodePath = parentPath ? `${parentPath}/${node.name}` : node.name
      if (node.type === "file") {
        // Update index
        this._fileIndex.delete(node.path)
        const updated = { ...node, path: nodePath, depth }
        this._fileIndex.set(nodePath, updated)
        return updated
      }
      // Folder
      this._folderIndex.delete(node.path)
      const updatedChildren = node.children.map((child) => updatePaths(child, nodePath, depth + 1))
      const updated = { ...node, path: nodePath, depth, children: updatedChildren }
      this._folderIndex.set(nodePath, updated)
      return updated
    }

    const newDepth = (targetParent.path ? targetParent.path.split("/").length : 0) + 1
    const updatedNode = updatePaths(removedNode, newParentPath, newDepth)

    // Insert at target location
    ;(targetParent.children as TreeNode<T>[]).splice(insertIndex, 0, updatedNode)

    return true
  }

  private collectDescendantPaths(folder: FolderNode<T>): readonly string[] {
    const paths: string[] = []
    for (const child of folder.children) {
      paths.push(child.path)
      if (child.type === "folder") {
        paths.push(...this.collectDescendantPaths(child))
      }
    }
    return paths
  }

  private collectFolderPaths(node: TreeNode<T>): readonly string[] {
    return match(node)
      .with({ type: "file" }, () => [] as string[])
      .with({ type: "folder" }, (folder) => {
        const paths: string[] = [folder.path]
        for (const child of folder.children) {
          paths.push(...this.collectFolderPaths(child))
        }
        return paths
      })
      .exhaustive()
  }

  private collectVisibleNodes(node: TreeNode<T>): readonly TreeNode<T>[] {
    return match(node)
      .with({ type: "file" }, () => [node])
      .with({ type: "folder" }, (folder) => {
        const nodes: TreeNode<T>[] = [folder]
        if (this._expandedPaths.has(folder.path)) {
          for (const child of folder.children) {
            nodes.push(...this.collectVisibleNodes(child))
          }
        }
        return nodes
      })
      .exhaustive()
  }
}

/**
 * Factory function
 */
export function createFileTreeManager<T = FileData>(
  root: FolderNode<T> | null = null,
): FileTreeManager<T> {
  return new FileTreeManager<T>(root)
}
