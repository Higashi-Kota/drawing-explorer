import {
  type DropPosition,
  type EditingState,
  type TreeNode as FileTreeNode,
  ROOT_PATH,
  TreeView,
} from "@internal/file-tree"
import { FilePlus, FolderPlus, Loader2 } from "lucide-react"
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
  useSyncExternalStore,
} from "react"
import { match } from "ts-pattern"
import type { FileNode as OPFSFileNode } from "../../lib/opfs"
import { getOPFSStore } from "../../stores/opfsStore"

interface SidebarProps {
  onFileOpen?: (node: OPFSFileNode) => void
  onFileRename?: (oldPath: string, newPath: string, newName: string) => void
  onFileMove?: (oldPath: string, newPath: string) => void
  onFileDelete?: (paths: readonly string[]) => void
}

export interface SidebarRef {
  addFile: (name: string, path: string) => void
}

/**
 * Adapter to make OPFSStore compatible with FileTreeManager interface expected by TreeView
 */
class OPFSTreeAdapter {
  constructor(private store: ReturnType<typeof getOPFSStore>) {}

  get root() {
    return this.store.root
  }

  get expandedPaths() {
    return this.store.expandedPaths
  }

  get focusedPath() {
    return this.store.focusedPath
  }

  get selectedIds() {
    return this.store.selectedIds
  }

  get isAddMode() {
    return false
  }

  getNode(path: string) {
    return this.store.getNode(path)
  }

  getFile(path: string) {
    return this.store.getFile(path)
  }

  getFolder(path: string) {
    return this.store.getFolder(path)
  }

  getDescendants(path: string) {
    return this.store.getDescendants(path)
  }

  isSelected(path: string) {
    return this.store.isSelected(path)
  }

  select(path: string) {
    this.store.select(path)
  }

  toggleSelection(path: string) {
    return this.store.toggleSelection(path)
  }

  selectRange(targetPath: string, addToExisting = false) {
    this.store.selectRange(targetPath, addToExisting)
  }

  toggleExpansion(path: string) {
    return this.store.toggleExpansion(path)
  }

  expand(path: string) {
    this.store.expand(path)
  }

  setFocusedPath(path: string | null) {
    this.store.setFocusedPath(path)
  }

  expandSiblings(path: string) {
    const node = this.store.getNode(path)
    if (!node) return

    const parentPath = this.getParentPath(path)
    const parent = parentPath === "" ? this.store.root : this.store.getFolder(parentPath)
    if (!parent) return

    for (const child of parent.children) {
      if (child.type === "folder") {
        this.store.expand(child.path)
      }
    }
  }

  private getParentPath(path: string): string {
    const lastSlashIndex = path.lastIndexOf("/")
    if (lastSlashIndex === -1) return ""
    return path.slice(0, lastSlashIndex)
  }
}

export const Sidebar = forwardRef<SidebarRef, SidebarProps>(
  ({ onFileOpen, onFileRename, onFileMove, onFileDelete }, ref) => {
    const store = getOPFSStore()
    const [adapter] = useState(() => new OPFSTreeAdapter(store))
    const [editingState, setEditingState] = useState<EditingState | null>(null)

    // Subscribe to store updates
    useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)

    // Initialize OPFS on mount
    useEffect(() => {
      store.initialize()
    }, [store])

    // Expose addFile method via ref
    useImperativeHandle(ref, () => ({
      addFile: async (name: string, _path: string) => {
        await store.create("", name, "file")
      },
    }))

    const handleTreeUpdate = useCallback(() => {
      // Force re-render by subscribing to store version
      // The useSyncExternalStore handles this automatically
    }, [])

    const handleFileSelect = useCallback(
      (path: string) => {
        const node = store.getFile(path)
        if (node) {
          onFileOpen?.(node)
        }
      },
      [store, onFileOpen],
    )

    const handleOpen = useCallback(
      (node: FileTreeNode) => {
        if (node.type === "file") {
          // Cast to OPFS type to access handle
          const opfsNode = store.getFile(node.path)
          if (opfsNode) {
            onFileOpen?.(opfsNode)
          }
        }
      },
      [store, onFileOpen],
    )

    const handleCreate = useCallback(
      async (parentPath: string, name: string, type: "file" | "folder") => {
        await store.create(parentPath, name, type)
      },
      [store],
    )

    const handleRename = useCallback(
      async (path: string, newName: string) => {
        const node = store.getNode(path)
        if (!node) return

        // Calculate new path
        const lastSlashIndex = path.lastIndexOf("/")
        const newPath =
          lastSlashIndex === -1 ? newName : `${path.slice(0, lastSlashIndex)}/${newName}`

        // For folders, collect descendant paths BEFORE rename (store will refresh after)
        const descendantPaths: string[] = []
        if (node.type === "folder") {
          descendantPaths.push(...store.getDescendants(path))
        }

        const success = await store.rename(path, newName)
        if (success) {
          // For folders, notify about all descendant paths being renamed
          for (const oldDescPath of descendantPaths) {
            const relativePath = oldDescPath.slice(path.length)
            const newDescPath = newPath + relativePath
            onFileRename?.(oldDescPath, newDescPath, oldDescPath.split("/").pop() ?? "")
          }
          onFileRename?.(path, newPath, newName)
        }
      },
      [store, onFileRename],
    )

    const handleDelete = useCallback(
      async (node: FileTreeNode) => {
        // Collect all paths that will be deleted (including descendants for folders)
        const pathsToDelete: string[] = [node.path]
        if (node.type === "folder") {
          const descendants = store.getDescendants(node.path)
          pathsToDelete.push(...descendants)
        }

        // Notify parent before deletion so it can close open panels
        onFileDelete?.(pathsToDelete)

        await store.delete(node.path)
      },
      [store, onFileDelete],
    )

    const handleMove = useCallback(
      async (sourcePaths: readonly string[], targetPath: string, position: DropPosition) => {
        for (const sourcePath of sourcePaths) {
          const node = store.getNode(sourcePath)
          if (!node) continue

          // Calculate new path after move
          let newParentPath: string
          if (position === "inside") {
            newParentPath = targetPath
          } else {
            const lastSlash = targetPath.lastIndexOf("/")
            newParentPath = lastSlash === -1 ? "" : targetPath.slice(0, lastSlash)
          }
          const newPath = newParentPath ? `${newParentPath}/${node.name}` : node.name

          // Skip if moving to same location
          const oldParentPath =
            sourcePath.lastIndexOf("/") === -1
              ? ""
              : sourcePath.slice(0, sourcePath.lastIndexOf("/"))
          if (oldParentPath === newParentPath) continue

          // Notify parent about the path change for open panels
          if (sourcePath !== newPath) {
            onFileMove?.(sourcePath, newPath)
          }
        }

        await store.move(sourcePaths, targetPath, position)
      },
      [store, onFileMove],
    )

    // Expand root by default on ready
    useEffect(() => {
      if (store.appState.type === "ready" && store.root) {
        store.expand(store.root.path)
      }
    }, [store, store.appState.type])

    // Render based on app state
    const content = match(store.appState)
      .with({ type: "initializing" }, () => (
        <div className='flex-1 flex items-center justify-center text-muted-foreground'>
          <Loader2 className='w-5 h-5 animate-spin' />
        </div>
      ))
      .with({ type: "error" }, ({ message }: { type: "error"; message: string }) => (
        <div className='flex-1 flex items-center justify-center text-destructive text-sm p-4 text-center'>
          {message}
        </div>
      ))
      .with({ type: "ready" }, () => (
        <div id='tree-scroll-container' className='flex-1 overflow-auto p-2 file-tree-container'>
          <TreeView
            tree={adapter as never}
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
      ))
      .exhaustive()

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
              disabled={store.appState.type !== "ready"}
            >
              <FilePlus className='w-4 h-4 text-muted-foreground' />
            </button>
            <button
              type='button'
              className='p-1 rounded hover:bg-muted transition-colors'
              aria-label='New folder'
              onClick={() => setEditingState({ path: ROOT_PATH, type: "newFolder" })}
              disabled={store.appState.type !== "ready"}
            >
              <FolderPlus className='w-4 h-4 text-muted-foreground' />
            </button>
          </div>
        </div>

        {content}
      </div>
    )
  },
)

Sidebar.displayName = "Sidebar"
