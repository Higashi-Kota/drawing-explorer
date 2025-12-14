import type { TreeNode } from "../types"

/**
 * Generate unique ID
 */
export function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`
}

/**
 * Sort nodes for tree view (folders first, then alphabetically)
 */
export function sortForTreeView<T>(nodes: ReadonlyArray<TreeNode<T>>): ReadonlyArray<TreeNode<T>> {
  return [...nodes].sort((a, b) => {
    // Folders first
    if (a.type === "folder" && b.type === "file") return -1
    if (a.type === "file" && b.type === "folder") return 1
    // Then alphabetically
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  })
}

/**
 * Get file extension
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".")
  if (lastDot === -1 || lastDot === 0) return ""
  return filename.slice(lastDot + 1).toLowerCase()
}

/**
 * Get file type from extension
 */
export function getFileType(filename: string): string {
  const ext = getFileExtension(filename)
  const types: Record<string, string> = {
    // Images
    png: "Image",
    jpg: "Image",
    jpeg: "Image",
    gif: "Image",
    svg: "Image",
    webp: "Image",
    // Documents
    pdf: "PDF",
    doc: "Document",
    docx: "Document",
    txt: "Text",
    md: "Markdown",
    // Code
    js: "JavaScript",
    ts: "TypeScript",
    tsx: "TypeScript React",
    jsx: "JavaScript React",
    json: "JSON",
    html: "HTML",
    css: "CSS",
    // Drawing
    draw: "Drawing",
  }
  return types[ext] ?? "File"
}
