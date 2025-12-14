import { match } from "ts-pattern"
import type { OPFSError as OPFSErrorType, Result as ResultType } from "./Result"
import { OPFSError, Result } from "./Result"

// Re-export OPFSError for external use
export { OPFSError }

/**
 * System file/folder patterns to exclude from display
 * These are internal files that users shouldn't see
 */
const SYSTEM_FILE_PATTERNS = [
  /^\./, // Hidden files (start with dot)
  /^duckdb/, // DuckDB database files/folders
  /^search-index\.db/, // SQLite search index
  /\.db$/, // Database files (except user files)
  /\.db-journal$/, // SQLite journal
  /\.db-wal$/, // SQLite WAL
  /^\.ahp-[a-z0-9]+$/i, // SQLite WASM temp directories
] as const

/**
 * Check if a file/folder name is a system entry that should be hidden
 */
function isSystemEntry(name: string): boolean {
  return SYSTEM_FILE_PATTERNS.some((pattern) => pattern.test(name))
}

/**
 * Storage information
 */
export interface StorageInfo {
  readonly usage: number
  readonly quota: number
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
 * File node with OPFS handle
 */
export interface FileNode extends BaseNode {
  readonly type: "file"
  readonly handle: FileSystemFileHandle
  readonly data: FileData
}

/**
 * Folder node with OPFS handle
 */
export interface FolderNode extends BaseNode {
  readonly type: "folder"
  readonly handle: FileSystemDirectoryHandle
  readonly children: ReadonlyArray<TreeNode>
}

/**
 * Tree node union type
 */
export type TreeNode = FileNode | FolderNode

/**
 * Check if OPFS is supported
 */
export function isOPFSSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "storage" in navigator &&
    "getDirectory" in navigator.storage
  )
}

/**
 * Get OPFS root handle
 */
export async function getOPFSRoot(): Promise<ResultType<FileSystemDirectoryHandle, OPFSErrorType>> {
  if (!isOPFSSupported()) {
    return Result.error(OPFSError.notSupported("OPFS is not supported in this browser"))
  }

  try {
    const root = await navigator.storage.getDirectory()
    return Result.success(root)
  } catch (cause) {
    return Result.error(OPFSError.unknown(cause))
  }
}

/**
 * Get storage info
 */
export async function getStorageInfo(): Promise<ResultType<StorageInfo, OPFSErrorType>> {
  try {
    const estimate = await navigator.storage.estimate()
    return Result.success({
      usage: estimate.usage ?? 0,
      quota: estimate.quota ?? 0,
    })
  } catch (cause) {
    return Result.error(OPFSError.unknown(cause))
  }
}

/**
 * Get MIME type from file extension
 */
function getMimeType(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase()
  const mimeTypes: Record<string, string> = {
    draw: "application/draw",
    txt: "text/plain",
    md: "text/markdown",
    json: "application/json",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    svg: "image/svg+xml",
  }
  return mimeTypes[ext ?? ""] ?? "application/octet-stream"
}

/**
 * Scan directory recursively and build tree
 */
export async function scanDirectory(
  dirHandle: FileSystemDirectoryHandle,
  path = "",
  depth = 0,
): Promise<ResultType<FolderNode, OPFSErrorType>> {
  try {
    const children: TreeNode[] = []

    for await (const [name, handle] of dirHandle.entries()) {
      // Skip system files/folders
      if (isSystemEntry(name)) {
        continue
      }

      const nodePath = path ? `${path}/${name}` : name
      const nodeId = nodePath

      if (handle.kind === "file") {
        const fileHandle = handle
        const file = await fileHandle.getFile()
        const mimeType = getMimeType(name)
        const fileNode: FileNode = {
          id: nodeId,
          type: "file",
          name,
          path: nodePath,
          depth: depth + 1,
          handle: fileHandle,
          data: {
            size: file.size,
            lastModified: file.lastModified,
            mimeType,
          },
        }
        children.push(fileNode)
      } else {
        const dirHandleChild = handle
        const subResult = await scanDirectory(dirHandleChild, nodePath, depth + 1)
        if (subResult.type === "error") {
          return subResult
        }
        children.push(subResult.data)
      }
    }

    // Sort: folders first, then by name
    children.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1
      return a.name.localeCompare(b.name)
    })

    const folderNode: FolderNode = {
      id: path || "root",
      type: "folder",
      name: path ? (path.split("/").pop() ?? "") : "drawings",
      path,
      depth,
      handle: dirHandle,
      children,
    }

    return Result.success(folderNode)
  } catch (cause) {
    return Result.error(OPFSError.unknown(cause))
  }
}

/**
 * Navigate to directory by path segments
 */
export async function navigateToPath(
  root: FileSystemDirectoryHandle,
  pathSegments: readonly string[],
): Promise<ResultType<FileSystemDirectoryHandle, OPFSErrorType>> {
  try {
    let current = root
    for (const segment of pathSegments) {
      current = await current.getDirectoryHandle(segment)
    }
    return Result.success(current)
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "NotFoundError") {
      return Result.error(OPFSError.notFound(pathSegments.join("/")))
    }
    return Result.error(OPFSError.unknown(cause))
  }
}

/**
 * Create a new file
 */
export async function createFile(
  parentHandle: FileSystemDirectoryHandle,
  fileName: string,
  content = "",
): Promise<ResultType<FileSystemFileHandle, OPFSErrorType>> {
  try {
    const fileHandle = await parentHandle.getFileHandle(fileName, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(content)
    await writable.close()
    return Result.success(fileHandle)
  } catch (cause) {
    return Result.error(OPFSError.unknown(cause))
  }
}

/**
 * Create a new folder
 */
export async function createFolder(
  parentHandle: FileSystemDirectoryHandle,
  folderName: string,
): Promise<ResultType<FileSystemDirectoryHandle, OPFSErrorType>> {
  try {
    const dirHandle = await parentHandle.getDirectoryHandle(folderName, { create: true })
    return Result.success(dirHandle)
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "InvalidModificationError") {
      return Result.error(OPFSError.alreadyExists(folderName))
    }
    return Result.error(OPFSError.unknown(cause))
  }
}

/**
 * Delete an entry (file or folder)
 */
export async function deleteEntry(
  parentHandle: FileSystemDirectoryHandle,
  name: string,
  isDirectory: boolean,
): Promise<ResultType<void, OPFSErrorType>> {
  try {
    await parentHandle.removeEntry(name, { recursive: isDirectory })
    return Result.success(undefined)
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "NotFoundError") {
      return Result.error(OPFSError.notFound(name))
    }
    return Result.error(OPFSError.unknown(cause))
  }
}

/**
 * Read file content
 */
export async function readFile(
  fileHandle: FileSystemFileHandle,
): Promise<ResultType<string, OPFSErrorType>> {
  try {
    const file = await fileHandle.getFile()
    const content = await file.text()
    return Result.success(content)
  } catch (cause) {
    return Result.error(OPFSError.unknown(cause))
  }
}

/**
 * Write file content
 */
export async function writeFile(
  fileHandle: FileSystemFileHandle,
  content: string,
): Promise<ResultType<void, OPFSErrorType>> {
  try {
    const writable = await fileHandle.createWritable()
    await writable.write(content)
    await writable.close()
    return Result.success(undefined)
  } catch (cause) {
    return Result.error(OPFSError.unknown(cause))
  }
}

/**
 * Copy a file
 */
export async function copyFile(
  sourceHandle: FileSystemFileHandle,
  targetDir: FileSystemDirectoryHandle,
  newName?: string,
): Promise<ResultType<FileSystemFileHandle, OPFSErrorType>> {
  try {
    const file = await sourceHandle.getFile()
    const finalName = newName ?? file.name
    const targetHandle = await targetDir.getFileHandle(finalName, { create: true })
    const writable = await targetHandle.createWritable()
    await writable.write(file)
    await writable.close()
    return Result.success(targetHandle)
  } catch (cause) {
    return Result.error(OPFSError.unknown(cause))
  }
}

/**
 * Copy a folder recursively
 */
export async function copyFolder(
  sourceHandle: FileSystemDirectoryHandle,
  targetDir: FileSystemDirectoryHandle,
  newName?: string,
): Promise<ResultType<{ handle: FileSystemDirectoryHandle; name: string }, OPFSErrorType>> {
  try {
    const finalName = newName ?? sourceHandle.name
    const newDir = await targetDir.getDirectoryHandle(finalName, { create: true })

    for await (const [, handle] of sourceHandle.entries()) {
      if (handle.kind === "file") {
        const copyResult = await copyFile(handle, newDir)
        if (copyResult.type === "error") {
          return Result.error(copyResult.error)
        }
      } else {
        const copyResult = await copyFolder(handle, newDir)
        if (copyResult.type === "error") {
          return Result.error(copyResult.error)
        }
      }
    }

    return Result.success({ handle: newDir, name: finalName })
  } catch (cause) {
    return Result.error(OPFSError.unknown(cause))
  }
}

/**
 * Rename an entry (copy + delete)
 */
export async function renameEntry(
  parentHandle: FileSystemDirectoryHandle,
  oldName: string,
  newName: string,
  isDirectory: boolean,
): Promise<ResultType<void, OPFSErrorType>> {
  try {
    if (isDirectory) {
      const sourceHandle = await parentHandle.getDirectoryHandle(oldName)
      const copyResult = await copyFolder(sourceHandle, parentHandle, newName)
      if (copyResult.type === "error") {
        return copyResult
      }
    } else {
      const sourceHandle = await parentHandle.getFileHandle(oldName)
      const copyResult = await copyFile(sourceHandle, parentHandle, newName)
      if (copyResult.type === "error") {
        return copyResult
      }
    }

    await parentHandle.removeEntry(oldName, { recursive: isDirectory })
    return Result.success(undefined)
  } catch (cause) {
    return Result.error(OPFSError.unknown(cause))
  }
}

/**
 * Move an entry (copy + delete)
 */
export async function moveEntry(
  root: FileSystemDirectoryHandle,
  sourcePath: string,
  targetFolderPath: string,
  isDirectory: boolean,
): Promise<ResultType<void, OPFSErrorType>> {
  try {
    // Get source parent directory and entry name
    const sourceSegments = sourcePath.split("/")
    const entryName = sourceSegments.pop()
    if (!entryName) {
      return Result.error(OPFSError.notFound(sourcePath))
    }

    // Get source parent directory handle
    const sourceParentResult = await navigateToPath(root, sourceSegments)
    if (sourceParentResult.type === "error") {
      return sourceParentResult
    }
    const sourceParent = sourceParentResult.data

    // Get target directory handle
    const targetSegments = targetFolderPath ? targetFolderPath.split("/") : []
    const targetDirResult = await navigateToPath(root, targetSegments)
    if (targetDirResult.type === "error") {
      return targetDirResult
    }
    const targetDir = targetDirResult.data

    // If moving to same parent, do nothing
    if (sourceSegments.join("/") === targetFolderPath) {
      return Result.success(undefined)
    }

    // Copy
    if (isDirectory) {
      const sourceHandle = await sourceParent.getDirectoryHandle(entryName)
      const copyResult = await copyFolder(sourceHandle, targetDir, entryName)
      if (copyResult.type === "error") {
        return copyResult
      }
    } else {
      const sourceHandle = await sourceParent.getFileHandle(entryName)
      const copyResult = await copyFile(sourceHandle, targetDir, entryName)
      if (copyResult.type === "error") {
        return copyResult
      }
    }

    // Delete original
    await sourceParent.removeEntry(entryName, { recursive: isDirectory })
    return Result.success(undefined)
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "NotFoundError") {
      return Result.error(OPFSError.notFound(sourcePath))
    }
    return Result.error(OPFSError.unknown(cause))
  }
}

/**
 * Get error message from OPFSError
 */
export function getErrorMessage(error: OPFSErrorType): string {
  return match(error)
    .with({ type: "notSupported" }, (e: { type: "notSupported"; message: string }) => e.message)
    .with(
      { type: "permissionDenied" },
      (e: { type: "permissionDenied"; message: string }) => e.message,
    )
    .with({ type: "notFound" }, (e: { type: "notFound"; path: string }) => `Not found: ${e.path}`)
    .with(
      { type: "alreadyExists" },
      (e: { type: "alreadyExists"; path: string }) => `Already exists: ${e.path}`,
    )
    .with(
      { type: "unknown" },
      (e: { type: "unknown"; cause: unknown }) => `Unknown error: ${String(e.cause)}`,
    )
    .exhaustive()
}

/**
 * Create sample data for demonstration
 */
export async function createSampleData(
  root: FileSystemDirectoryHandle,
): Promise<ResultType<void, OPFSErrorType>> {
  try {
    // Projects folder
    const projectsResult = await createFolder(root, "Projects")
    if (projectsResult.type === "error") return projectsResult
    const projects = projectsResult.data

    await createFile(projects, "landscape.draw", "")
    await createFile(projects, "portrait.draw", "")

    // Sketches folder
    const sketchesResult = await createFolder(root, "Sketches")
    if (sketchesResult.type === "error") return sketchesResult
    const sketches = sketchesResult.data

    await createFile(sketches, "quick-sketch.draw", "")

    // Root file
    await createFile(root, "untitled.draw", "")

    return Result.success(undefined)
  } catch (cause) {
    return Result.error(OPFSError.unknown(cause))
  }
}
