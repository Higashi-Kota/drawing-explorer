/**
 * Root directory constant (empty string = root)
 */
export const ROOT_PATH = "" as const

/**
 * Check if path is root
 */
export function isRootPath(path: string): boolean {
  return path === ROOT_PATH
}

/**
 * Convert path to segments array (root = empty array)
 */
export function pathToSegments(path: string): readonly string[] {
  if (isRootPath(path)) return []
  return path.split("/").filter(Boolean)
}

/**
 * Convert segments array to path (empty array = root)
 */
export function segmentsToPath(segments: readonly string[]): string {
  if (segments.length === 0) return ROOT_PATH
  return segments.join("/")
}

/**
 * Get parent directory path
 */
export function getParentPath(path: string): string {
  if (isRootPath(path)) return ROOT_PATH
  const lastSlashIndex = path.lastIndexOf("/")
  if (lastSlashIndex === -1) return ROOT_PATH
  return path.slice(0, lastSlashIndex)
}

/**
 * File metadata
 */
export interface FileData {
  readonly size: number
  readonly lastModified: number
  readonly mimeType: string
}

/**
 * Base node interface
 */
export interface BaseNode {
  readonly id: string
  readonly name: string
  readonly path: string
  readonly depth: number
}

/**
 * File node
 */
export interface FileNode<T = FileData> extends BaseNode {
  readonly type: "file"
  readonly data: T
}

/**
 * Folder node
 */
export interface FolderNode<T = FileData> extends BaseNode {
  readonly type: "folder"
  readonly children: ReadonlyArray<TreeNode<T>>
}

/**
 * Tree node union type
 */
export type TreeNode<T = FileData> = FileNode<T> | FolderNode<T>

/**
 * Drop position types
 */
export type DropPosition = "before" | "after" | "inside"

/**
 * Drop target info
 */
export interface DropTarget {
  readonly path: string
  readonly position: DropPosition
}

/**
 * Editing state types
 */
export type EditingType = "rename" | "newFile" | "newFolder"

/**
 * Editing state
 */
export interface EditingState {
  readonly path: string
  readonly type: EditingType
}

/**
 * Context menu state
 */
export interface ContextMenuState {
  readonly node: TreeNode
  readonly x: number
  readonly y: number
}
