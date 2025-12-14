import {
  createId,
  type DropPosition,
  type EditingState,
  type FileNode,
  FileTreeManager,
  type FolderNode,
  ROOT_PATH,
  type TreeNode,
  TreeView,
} from "@internal/file-tree"
import { FilePlus, FolderPlus } from "lucide-react"
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react"

interface SidebarProps {
  onFileOpen?: (node: FileNode) => void
  onFileRename?: (oldPath: string, newPath: string, newName: string) => void
  onFileMove?: (oldPath: string, newPath: string) => void
}

export interface SidebarRef {
  addFile: (name: string, path: string) => void
}

// Create sample data for demonstration
function createSampleTree(): FolderNode {
  return {
    id: "root",
    name: "drawings",
    path: "",
    depth: 0,
    type: "folder",
    children: [
      {
        id: createId(),
        name: "Projects",
        path: "Projects",
        depth: 1,
        type: "folder",
        children: [
          {
            id: createId(),
            name: "landscape.draw",
            path: "Projects/landscape.draw",
            depth: 2,
            type: "file",
            data: { size: 2048, lastModified: Date.now() - 86400000, mimeType: "application/draw" },
          },
          {
            id: createId(),
            name: "portrait.draw",
            path: "Projects/portrait.draw",
            depth: 2,
            type: "file",
            data: {
              size: 1536,
              lastModified: Date.now() - 172800000,
              mimeType: "application/draw",
            },
          },
        ],
      },
      {
        id: createId(),
        name: "Sketches",
        path: "Sketches",
        depth: 1,
        type: "folder",
        children: [
          {
            id: createId(),
            name: "quick-sketch.draw",
            path: "Sketches/quick-sketch.draw",
            depth: 2,
            type: "file",
            data: { size: 512, lastModified: Date.now() - 3600000, mimeType: "application/draw" },
          },
        ],
      },
      {
        id: createId(),
        name: "untitled.draw",
        path: "untitled.draw",
        depth: 1,
        type: "file",
        data: { size: 1024, lastModified: Date.now(), mimeType: "application/draw" },
      },
    ],
  }
}

export const Sidebar = forwardRef<SidebarRef, SidebarProps>(
  ({ onFileOpen, onFileRename, onFileMove }, ref) => {
    const [tree] = useState(() => new FileTreeManager(createSampleTree()))
    const [, forceUpdate] = useState({})
    const [editingState, setEditingState] = useState<EditingState | null>(null)

    // Expose addFile method via ref
    useImperativeHandle(ref, () => ({
      addFile: (name: string, path: string) => {
        const newFile: FileNode = {
          id: createId(),
          name,
          path,
          depth: 1,
          type: "file",
          data: { size: 0, lastModified: Date.now(), mimeType: "application/draw" },
        }
        tree.addFile(newFile, "")
        forceUpdate({})
      },
    }))

    const handleTreeUpdate = useCallback(() => {
      forceUpdate({})
    }, [])

    const handleFileSelect = useCallback(
      (path: string) => {
        const node = tree.getFile(path)
        if (node) {
          onFileOpen?.(node)
        }
      },
      [tree, onFileOpen],
    )

    const handleOpen = useCallback(
      (node: TreeNode) => {
        if (node.type === "file") {
          onFileOpen?.(node)
        }
      },
      [onFileOpen],
    )

    const handleCreate = useCallback(
      (parentPath: string, name: string, type: "file" | "folder") => {
        console.log(`Create ${type}: ${name} in ${parentPath}`)

        const newPath = parentPath ? `${parentPath}/${name}` : name
        const parentNode = parentPath ? tree.getFolder(parentPath) : tree.root
        const depth = parentNode ? parentNode.depth + 1 : 1

        if (type === "file") {
          const newFile: FileNode = {
            id: createId(),
            name,
            path: newPath,
            depth,
            type: "file",
            data: { size: 0, lastModified: Date.now(), mimeType: "application/draw" },
          }
          tree.addFile(newFile, parentPath)
        } else {
          // For folders, we need to add to the tree manually
          const newFolder: FolderNode = {
            id: createId(),
            name,
            path: newPath,
            depth,
            type: "folder",
            children: [],
          }
          // Add folder to tree (using internal method pattern)
          const parent = parentPath === "" ? tree.root : tree.getFolder(parentPath)
          if (parent) {
            ;(parent.children as TreeNode[]).push(newFolder)
          }
        }
        forceUpdate({})
      },
      [tree],
    )

    const handleRename = useCallback(
      (path: string, newName: string) => {
        console.log(`Rename: ${path} to ${newName}`)

        // Calculate new path
        const lastSlashIndex = path.lastIndexOf("/")
        const newPath =
          lastSlashIndex === -1 ? newName : `${path.slice(0, lastSlashIndex)}/${newName}`

        // Notify parent about the rename
        onFileRename?.(path, newPath, newName)
      },
      [onFileRename],
    )

    const handleDelete = useCallback((node: TreeNode) => {
      console.log(`Delete: ${node.path}`)
    }, [])

    const handleMove = useCallback(
      (sourcePaths: readonly string[], targetPath: string, position: DropPosition) => {
        console.log(`Move: ${sourcePaths.join(", ")} to ${targetPath} (${position})`)
        for (const sourcePath of sourcePaths) {
          // Get node info before move to calculate new path
          const node = tree.getNode(sourcePath)
          if (!node) continue

          // Calculate new path after move
          let newParentPath: string
          if (position === "inside") {
            newParentPath = targetPath
          } else {
            const targetNode = tree.getNode(targetPath)
            if (!targetNode) continue
            const lastSlash = targetPath.lastIndexOf("/")
            newParentPath = lastSlash === -1 ? "" : targetPath.slice(0, lastSlash)
          }
          const newPath = newParentPath ? `${newParentPath}/${node.name}` : node.name

          // Perform the move
          const success = tree.moveNode(sourcePath, targetPath, position)

          // Notify parent about the path change for open panels
          if (success && sourcePath !== newPath) {
            onFileMove?.(sourcePath, newPath)
          }
        }
        forceUpdate({})
      },
      [tree, onFileMove],
    )

    // Expand root by default
    useEffect(() => {
      if (tree.root) {
        tree.expand(tree.root.path)
        handleTreeUpdate()
      }
    }, [tree, handleTreeUpdate])

    return (
      <div className='h-full flex flex-col bg-card'>
        <div className='flex items-center justify-between px-3 py-2 border-b border-border'>
          <span className='text-sm font-medium text-muted-foreground uppercase tracking-wide'>
            Explorer
          </span>
          <div className='flex items-center gap-1'>
            <button
              type='button'
              className='p-1 rounded hover:bg-muted transition-colors'
              aria-label='New file'
              onClick={() => setEditingState({ path: ROOT_PATH, type: "newFile" })}
            >
              <FilePlus className='w-4 h-4 text-muted-foreground' />
            </button>
            <button
              type='button'
              className='p-1 rounded hover:bg-muted transition-colors'
              aria-label='New folder'
              onClick={() => setEditingState({ path: ROOT_PATH, type: "newFolder" })}
            >
              <FolderPlus className='w-4 h-4 text-muted-foreground' />
            </button>
          </div>
        </div>

        <div id='tree-scroll-container' className='flex-1 overflow-auto p-2 file-tree-container'>
          <TreeView
            tree={tree}
            onTreeUpdate={handleTreeUpdate}
            onFileSelect={handleFileSelect}
            onOpen={handleOpen}
            onCreate={handleCreate}
            onRename={handleRename}
            onDelete={handleDelete}
            onMove={handleMove}
            externalEditingState={editingState}
            onEditingStateChange={setEditingState}
          />
        </div>
      </div>
    )
  },
)

Sidebar.displayName = "Sidebar"
