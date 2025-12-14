import { match } from "ts-pattern"
import type { FileNode, FolderNode, TreeNode } from "../lib/opfs"
import {
  createFile,
  createFolder,
  createSampleData,
  deleteEntry,
  getErrorMessage,
  getOPFSRoot,
  isOPFSSupported,
  moveEntry,
  navigateToPath,
  renameEntry,
  scanDirectory,
} from "../lib/opfs"

// Re-export types
export type { FileNode, FolderNode, TreeNode }

/**
 * App state for OPFS initialization
 */
export type AppState =
  | { readonly type: "initializing" }
  | { readonly type: "ready" }
  | { readonly type: "error"; readonly message: string }

/**
 * OPFS Store - Manages OPFS file system state with O(1) lookups
 */
export class OPFSStore {
  private _rootHandle: FileSystemDirectoryHandle | null = null
  private _root: FolderNode | null = null
  private _appState: AppState = { type: "initializing" }

  // O(1) lookup indices
  private readonly _fileIndex: Map<string, FileNode> = new Map()
  private readonly _folderIndex: Map<string, FolderNode> = new Map()

  // Selection state
  private readonly _selectedIds: Set<string> = new Set()
  private _anchorId: string | null = null

  // Expansion state
  private readonly _expandedPaths: Set<string> = new Set()

  // Focus state
  private _focusedPath: string | null = null

  // Subscription for React re-renders
  private readonly _listeners: Set<() => void> = new Set()
  private _version = 0

  // ==========================================
  // Initialization
  // ==========================================

  async initialize(): Promise<void> {
    if (!isOPFSSupported()) {
      this._appState = { type: "error", message: "OPFS is not supported in this browser" }
      this.notify()
      return
    }

    const rootResult = await getOPFSRoot()
    if (rootResult.type === "error") {
      this._appState = { type: "error", message: getErrorMessage(rootResult.error) }
      this.notify()
      return
    }

    this._rootHandle = rootResult.data

    // Check if OPFS is empty
    let isEmpty = true
    for await (const _ of this._rootHandle.entries()) {
      isEmpty = false
      break
    }

    // Create sample data if empty
    if (isEmpty) {
      const sampleResult = await createSampleData(this._rootHandle)
      if (sampleResult.type === "error") {
        console.warn("Failed to create sample data:", getErrorMessage(sampleResult.error))
      }
    }

    // Scan directory tree
    await this.refresh()

    this._appState = { type: "ready" }
    this.notify()
  }

  async refresh(): Promise<void> {
    if (!this._rootHandle) return

    const scanResult = await scanDirectory(this._rootHandle)
    if (scanResult.type === "error") {
      console.error("Failed to scan directory:", getErrorMessage(scanResult.error))
      return
    }

    // Store previous expansion state
    const prevExpandedPaths = new Set(this._expandedPaths)

    // Set new root and rebuild indices
    this._root = scanResult.data
    this._fileIndex.clear()
    this._folderIndex.clear()
    this.buildIndices(this._root)

    // Restore expansion state (only for paths that still exist)
    this._expandedPaths.clear()
    for (const path of prevExpandedPaths) {
      if (this._folderIndex.has(path) || path === "") {
        this._expandedPaths.add(path)
      }
    }

    // Clear selection for paths that no longer exist
    for (const path of this._selectedIds) {
      if (!this._fileIndex.has(path) && !this._folderIndex.has(path)) {
        this._selectedIds.delete(path)
      }
    }

    this.notify()
  }

  private buildIndices(node: TreeNode): void {
    match(node)
      .with({ type: "file" }, (file: FileNode) => {
        this._fileIndex.set(file.path, file)
      })
      .with({ type: "folder" }, (folder: FolderNode) => {
        this._folderIndex.set(folder.path, folder)
        for (const child of folder.children) {
          this.buildIndices(child)
        }
      })
      .exhaustive()
  }

  // ==========================================
  // Getters
  // ==========================================

  get appState(): AppState {
    return this._appState
  }

  get root(): FolderNode | null {
    return this._root
  }

  get rootHandle(): FileSystemDirectoryHandle | null {
    return this._rootHandle
  }

  getFile(path: string): FileNode | undefined {
    return this._fileIndex.get(path)
  }

  getFolder(path: string): FolderNode | undefined {
    return this._folderIndex.get(path)
  }

  getNode(path: string): TreeNode | undefined {
    return this._fileIndex.get(path) ?? this._folderIndex.get(path)
  }

  // ==========================================
  // Selection Management
  // ==========================================

  select(path: string): void {
    this._selectedIds.clear()
    this._selectedIds.add(path)
    this._anchorId = path
    this.notify()
  }

  toggleSelection(path: string): boolean {
    let selected: boolean
    if (this._selectedIds.has(path)) {
      this._selectedIds.delete(path)
      selected = false
    } else {
      this._selectedIds.add(path)
      selected = true
    }
    this._anchorId = path
    this.notify()
    return selected
  }

  addToSelection(path: string): void {
    this._selectedIds.add(path)
    this.notify()
  }

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
    }

    for (let i = startIndex; i <= endIndex; i++) {
      const node = visibleNodes[i]
      if (node) {
        this._selectedIds.add(node.path)
      }
    }

    this.notify()
  }

  clearSelection(): void {
    this._selectedIds.clear()
    this._anchorId = null
    this.notify()
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

  getSelectedNodes(): readonly TreeNode[] {
    const nodes: TreeNode[] = []
    for (const path of this._selectedIds) {
      const node = this.getNode(path)
      if (node) {
        nodes.push(node)
      }
    }
    return nodes
  }

  // ==========================================
  // Expansion Management
  // ==========================================

  toggleExpansion(path: string): boolean {
    let expanded: boolean
    if (this._expandedPaths.has(path)) {
      this._expandedPaths.delete(path)
      expanded = false
    } else {
      this._expandedPaths.add(path)
      expanded = true
    }
    this.notify()
    return expanded
  }

  expand(path: string): void {
    this._expandedPaths.add(path)
    this.notify()
  }

  collapse(path: string): void {
    this._expandedPaths.delete(path)
    this.notify()
  }

  expandAll(): void {
    if (!this._root) return
    for (const path of this.collectFolderPaths(this._root)) {
      this._expandedPaths.add(path)
    }
    this.notify()
  }

  collapseAll(): void {
    this._expandedPaths.clear()
    this.notify()
  }

  isExpanded(path: string): boolean {
    return this._expandedPaths.has(path)
  }

  get expandedPaths(): ReadonlySet<string> {
    return this._expandedPaths
  }

  // ==========================================
  // Focus Management
  // ==========================================

  setFocusedPath(path: string | null): void {
    this._focusedPath = path
    this.notify()
  }

  get focusedPath(): string | null {
    return this._focusedPath
  }

  isFocused(path: string): boolean {
    return this._focusedPath === path
  }

  // ==========================================
  // OPFS Operations
  // ==========================================

  /**
   * Check if a name already exists in the given parent folder
   * @returns Error message if duplicate exists, null otherwise
   */
  checkDuplicateName(parentPath: string, name: string, excludePath?: string): string | null {
    const parent = parentPath === "" ? this._root : this.getFolder(parentPath)
    if (!parent) return null

    for (const child of parent.children) {
      // Skip the node being renamed
      if (excludePath && child.path === excludePath) continue

      if (child.name.toLowerCase() === name.toLowerCase()) {
        const typeLabel = child.type === "folder" ? "フォルダ" : "ファイル"
        return `同じ名前の${typeLabel}「${child.name}」が既に存在します`
      }
    }

    return null
  }

  async create(parentPath: string, name: string, type: "file" | "folder"): Promise<boolean> {
    if (!this._rootHandle) return false

    // Check for duplicate name
    const duplicateError = this.checkDuplicateName(parentPath, name)
    if (duplicateError) {
      alert(duplicateError)
      return false
    }

    // Get parent handle
    const parentHandle =
      parentPath === "" ? this._rootHandle : await this.getDirectoryHandle(parentPath)

    if (!parentHandle) return false

    const result =
      type === "file"
        ? await createFile(parentHandle, name)
        : await createFolder(parentHandle, name)

    if (result.type === "error") {
      console.error(`Failed to create ${type}:`, getErrorMessage(result.error))
      return false
    }

    await this.refresh()

    // Select the new item
    const newPath = parentPath ? `${parentPath}/${name}` : name
    this.select(newPath)

    return true
  }

  async rename(path: string, newName: string): Promise<boolean> {
    if (!this._rootHandle) return false

    const node = this.getNode(path)
    if (!node) return false

    // Skip if name is unchanged
    if (node.name === newName) return true

    // Get parent handle
    const parentPath = this.getParentPath(path)

    // Check for duplicate name (exclude self)
    const duplicateError = this.checkDuplicateName(parentPath, newName, path)
    if (duplicateError) {
      alert(duplicateError)
      return false
    }

    const parentHandle =
      parentPath === "" ? this._rootHandle : await this.getDirectoryHandle(parentPath)

    if (!parentHandle) return false

    const result = await renameEntry(parentHandle, node.name, newName, node.type === "folder")

    if (result.type === "error") {
      console.error("Failed to rename:", getErrorMessage(result.error))
      return false
    }

    await this.refresh()

    // Select the renamed item
    const newPath = parentPath ? `${parentPath}/${newName}` : newName
    this.select(newPath)

    return true
  }

  async delete(path: string): Promise<boolean> {
    if (!this._rootHandle) return false

    const node = this.getNode(path)
    if (!node) return false

    // Get parent handle
    const parentPath = this.getParentPath(path)
    const parentHandle =
      parentPath === "" ? this._rootHandle : await this.getDirectoryHandle(parentPath)

    if (!parentHandle) return false

    const result = await deleteEntry(parentHandle, node.name, node.type === "folder")

    if (result.type === "error") {
      console.error("Failed to delete:", getErrorMessage(result.error))
      return false
    }

    await this.refresh()
    return true
  }

  async move(
    sourcePaths: readonly string[],
    targetPath: string,
    position: "before" | "after" | "inside",
  ): Promise<boolean> {
    if (!this._rootHandle) return false

    // Determine target folder path
    let targetFolderPath: string
    if (position === "inside") {
      targetFolderPath = targetPath
    } else {
      targetFolderPath = this.getParentPath(targetPath)
    }

    for (const sourcePath of sourcePaths) {
      const node = this.getNode(sourcePath)
      if (!node) continue

      // Skip if moving to same location
      const sourceParent = this.getParentPath(sourcePath)
      if (sourceParent === targetFolderPath) continue

      // Check for duplicate name in target folder
      const duplicateError = this.checkDuplicateName(targetFolderPath, node.name)
      if (duplicateError) {
        alert(duplicateError)
        return false
      }

      const result = await moveEntry(
        this._rootHandle,
        sourcePath,
        targetFolderPath,
        node.type === "folder",
      )

      if (result.type === "error") {
        console.error("Failed to move:", getErrorMessage(result.error))
        return false
      }
    }

    await this.refresh()
    return true
  }

  // ==========================================
  // Utilities
  // ==========================================

  getVisibleNodes(): readonly TreeNode[] {
    if (!this._root) return []
    return this.collectVisibleNodes(this._root)
  }

  getDescendants(path: string): readonly string[] {
    const node = this.getNode(path)
    if (!node || node.type === "file") return []
    return this.collectDescendantPaths(node)
  }

  private async getDirectoryHandle(path: string): Promise<FileSystemDirectoryHandle | null> {
    if (!this._rootHandle) return null
    const segments = path.split("/").filter(Boolean)
    const result = await navigateToPath(this._rootHandle, segments)
    if (result.type === "error") return null
    return result.data
  }

  private getParentPath(path: string): string {
    const lastSlashIndex = path.lastIndexOf("/")
    if (lastSlashIndex === -1) return ""
    return path.slice(0, lastSlashIndex)
  }

  private collectFolderPaths(node: TreeNode): readonly string[] {
    return match(node)
      .with({ type: "file" }, () => [] as string[])
      .with({ type: "folder" }, (folder: FolderNode) => {
        const paths: string[] = [folder.path]
        for (const child of folder.children) {
          paths.push(...this.collectFolderPaths(child))
        }
        return paths
      })
      .exhaustive()
  }

  private collectVisibleNodes(node: TreeNode): readonly TreeNode[] {
    return match(node)
      .with({ type: "file" }, () => [node])
      .with({ type: "folder" }, (folder: FolderNode) => {
        const nodes: TreeNode[] = [folder]
        if (this._expandedPaths.has(folder.path)) {
          for (const child of folder.children) {
            nodes.push(...this.collectVisibleNodes(child))
          }
        }
        return nodes
      })
      .exhaustive()
  }

  private collectDescendantPaths(folder: FolderNode): readonly string[] {
    const paths: string[] = []
    for (const child of folder.children) {
      paths.push(child.path)
      if (child.type === "folder") {
        paths.push(...this.collectDescendantPaths(child))
      }
    }
    return paths
  }

  // ==========================================
  // React Integration (useSyncExternalStore)
  // ==========================================

  subscribe = (listener: () => void): (() => void) => {
    this._listeners.add(listener)
    return () => this._listeners.delete(listener)
  }

  getSnapshot = (): number => {
    return this._version
  }

  private notify(): void {
    this._version++
    for (const listener of this._listeners) {
      listener()
    }
  }
}

// Singleton instance
let _store: OPFSStore | null = null

export function getOPFSStore(): OPFSStore {
  if (!_store) {
    _store = new OPFSStore()
  }
  return _store
}
