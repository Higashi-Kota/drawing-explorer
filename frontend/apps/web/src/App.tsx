import {
  DockingManager,
  DockingProvider,
  DockPanel,
  NodeRenderer,
  type PanelContent,
  type PanelNode,
} from "@internal/dock"
import { DrawingCanvas, type Stroke } from "@internal/drawing"
import { Provider as JotaiProvider } from "jotai"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Header } from "./components/Header"
import { Sidebar, type SidebarRef } from "./components/Sidebar"
import type { FileNode as OPFSFileNode } from "./lib/opfs"
import { readFile, writeFile } from "./lib/opfs"
import { getOPFSStore } from "./stores/opfsStore"

// Create initial layout with a new canvas
const createInitialLayout = (): PanelNode => ({
  type: "panel",
  id: "new-canvas",
  title: "Untitled",
  contentKey: "new-canvas",
  content: null,
})

/**
 * Generate a stable panel ID from file path
 */
function generatePanelId(filePath: string): string {
  return `panel-${filePath.replace(/[^a-zA-Z0-9]/g, "-")}`
}

export function App() {
  // Initialize docking manager with default state
  const [dockingManager] = useState(() => new DockingManager(createInitialLayout()))

  // Sidebar ref for adding files
  const sidebarRef = useRef<SidebarRef>(null)

  // Track open file panels: filePath -> { panelId, name, handle, strokes }
  const [filePanels, setFilePanels] = useState<
    Map<
      string,
      {
        id: string
        name: string
        handle: FileSystemFileHandle | null
        strokes: ReadonlyArray<Stroke>
      }
    >
  >(new Map())

  // Track unsaved panels (new canvases not yet saved)
  const [, setUnsavedPanels] = useState<Set<string>>(new Set(["new-canvas"]))

  // Force re-render when docking state changes
  const [, forceUpdate] = useState({})

  // Subscribe to panel removal to clean up filePanels
  useEffect(() => {
    const unsubscribe = dockingManager.on("panelRemoved", (panelId) => {
      setFilePanels((prev) => {
        const newMap = new Map(prev)
        for (const [path, info] of newMap) {
          if (info.id === panelId) {
            newMap.delete(path)
            break
          }
        }
        return newMap
      })
      setUnsavedPanels((prev) => {
        const newSet = new Set(prev)
        newSet.delete(panelId)
        return newSet
      })
    })
    return unsubscribe
  }, [dockingManager])

  // Handle save from canvas
  // Note: panelId here is actually the contentKey (file path) or "new-canvas"
  const handleSaveCanvas = useCallback(
    async (contentKeyOrPanelId: string, strokes: ReadonlyArray<Stroke>) => {
      const opfsStore = getOPFSStore()

      // Serialize strokes to JSON
      const content = JSON.stringify({ strokes }, null, 2)

      // contentKeyOrPanelId is either "new-canvas" or the file path
      const isNewCanvas = contentKeyOrPanelId === "new-canvas"

      if (!isNewCanvas) {
        // This is an existing file - overwrite it
        const filePath = contentKeyOrPanelId
        const fileNode = opfsStore.getFile(filePath)

        if (fileNode?.handle) {
          // Overwrite existing file
          const result = await writeFile(fileNode.handle, content)
          if (result.type === "error") {
            console.error("Failed to save file:", result.error)
            return
          }

          // Update strokes in filePanels
          setFilePanels((prev) => {
            const newMap = new Map(prev)
            const existingEntry = newMap.get(filePath)
            if (existingEntry) {
              newMap.set(filePath, { ...existingEntry, strokes })
            }
            return newMap
          })
        } else {
          console.error("File not found in OPFS store:", filePath)
        }
      } else {
        // New file - create in OPFS (only for Untitled panels)
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-")
        const fileName = `drawing-${timestamp}.draw`

        // Create file via OPFS store
        const success = await opfsStore.create("", fileName, "file")
        if (!success) {
          console.error("Failed to create file")
          return
        }

        // Get the file handle and write content
        const fileNode = opfsStore.getFile(fileName)
        if (fileNode) {
          const result = await writeFile(fileNode.handle, content)
          if (result.type === "error") {
            console.error("Failed to write file:", result.error)
            return
          }

          // Find the actual panel by contentKey ("new-canvas")
          const state = dockingManager.getState()
          const panel = findPanelByContentKey(state.root, "new-canvas")

          if (panel) {
            // Update panel info
            const newPanelId = generatePanelId(fileName)

            // Update filePanels tracking
            setFilePanels((prev) => {
              const newMap = new Map(prev)
              newMap.set(fileName, {
                id: newPanelId,
                name: fileName,
                handle: fileNode.handle,
                strokes,
              })
              return newMap
            })

            // Update panel title and content key using actual panel ID
            dockingManager.updatePanelTitle(panel.id, fileName)
            dockingManager.updatePanelContentKey(panel.id, fileName)

            // Mark as saved (remove from unsaved)
            setUnsavedPanels((prev) => {
              const newSet = new Set(prev)
              newSet.delete(panel.id)
              return newSet
            })
          }
        }
      }

      forceUpdate({})
    },
    [dockingManager],
  )

  // Available panel contents (base content + dynamic file panels)
  const availableContents = useMemo<PanelContent[]>(() => {
    const contents: PanelContent[] = []

    // New canvas content (for unsaved panels)
    contents.push({
      key: "new-canvas",
      label: "Untitled",
      content: <DrawingCanvas panelId='new-canvas' fileName='Untitled' onSave={handleSaveCanvas} />,
    })

    // Add file panel contents - use path as panelId for save identification
    filePanels.forEach(({ name, strokes }, path) => {
      contents.push({
        key: path,
        label: name,
        content: (
          <DrawingCanvas
            panelId={path}
            fileName={name}
            filePath={path}
            initialStrokes={strokes}
            onSave={handleSaveCanvas}
          />
        ),
      })
    })

    return contents
  }, [filePanels, handleSaveCanvas])

  // Handle file open from sidebar
  const handleFileOpen = useCallback(
    async (file: OPFSFileNode) => {
      // Check if file is already open by checking existing panels
      const state = dockingManager.getState()
      const existingPanel = findPanelByContentKey(state.root, file.path)

      if (existingPanel) {
        // Activate existing panel
        dockingManager.activatePanel(existingPanel.id)
        forceUpdate({})
        return
      }

      // Read file content to get strokes
      let strokes: ReadonlyArray<Stroke> = []
      const readResult = await readFile(file.handle)
      if (readResult.type === "success" && readResult.data) {
        try {
          const parsed = JSON.parse(readResult.data)
          if (parsed.strokes && Array.isArray(parsed.strokes)) {
            strokes = parsed.strokes
          }
        } catch {
          // File might be empty or invalid JSON
          console.log("Could not parse file content, starting with empty canvas")
        }
      }

      // Generate stable panel ID from file path
      const panelId = generatePanelId(file.path)

      // Add file to panel tracking with strokes
      setFilePanels((prev) => {
        const newMap = new Map(prev)
        newMap.set(file.path, {
          id: panelId,
          name: file.name,
          handle: file.handle,
          strokes,
        })
        return newMap
      })

      // Create new panel with file name as title
      dockingManager.addPanel(file.path, file.name)
      forceUpdate({})
    },
    [dockingManager],
  )

  // Handle file rename from sidebar - updates panel title
  const handleFileRename = useCallback(
    (oldPath: string, newPath: string, newName: string) => {
      const panelInfo = filePanels.get(oldPath)
      if (!panelInfo) return

      // Find panel by contentKey (old path)
      const state = dockingManager.getState()
      const panel = findPanelByContentKey(state.root, oldPath)

      if (panel) {
        // Update panel title to new name
        dockingManager.updatePanelTitle(panel.id, newName)
        // Update contentKey to new path
        dockingManager.updatePanelContentKey(panel.id, newPath)
      }

      // Get new handle from OPFS store (after rename, handle changes)
      const opfsStore = getOPFSStore()
      const newFileNode = opfsStore.getFile(newPath)

      // Update filePanels map with new path, name, and handle
      setFilePanels((prev) => {
        const newMap = new Map(prev)
        newMap.delete(oldPath)
        newMap.set(newPath, {
          id: panelInfo.id,
          name: newName,
          handle: newFileNode?.handle ?? panelInfo.handle,
          strokes: panelInfo.strokes,
        })
        return newMap
      })

      forceUpdate({})
    },
    [dockingManager, filePanels],
  )

  // Handle file move from sidebar - updates panel contentKey
  const handleFileMove = useCallback(
    (oldPath: string, newPath: string) => {
      const panelInfo = filePanels.get(oldPath)
      if (!panelInfo) return

      // Find panel by contentKey (old path)
      const state = dockingManager.getState()
      const panel = findPanelByContentKey(state.root, oldPath)

      if (panel) {
        // Update contentKey to new path (name stays the same)
        dockingManager.updatePanelContentKey(panel.id, newPath)
      }

      // Get new handle from OPFS store (after move, handle changes)
      const opfsStore = getOPFSStore()
      const newFileNode = opfsStore.getFile(newPath)

      // Update filePanels map with new path and new handle
      setFilePanels((prev) => {
        const newMap = new Map(prev)
        newMap.delete(oldPath)
        newMap.set(newPath, {
          id: panelInfo.id,
          name: panelInfo.name,
          handle: newFileNode?.handle ?? panelInfo.handle,
          strokes: panelInfo.strokes,
        })
        return newMap
      })

      forceUpdate({})
    },
    [dockingManager, filePanels],
  )

  // Handle file delete from sidebar - close open panels
  const handleFileDelete = useCallback(
    (deletedPaths: readonly string[]) => {
      for (const deletedPath of deletedPaths) {
        // Find panel by contentKey
        const state = dockingManager.getState()
        const panel = findPanelByContentKey(state.root, deletedPath)

        if (panel) {
          // Close the panel
          dockingManager.removePanel(panel.id)
        }

        // Remove from filePanels
        setFilePanels((prev) => {
          const newMap = new Map(prev)
          newMap.delete(deletedPath)
          return newMap
        })
      }

      forceUpdate({})
    },
    [dockingManager],
  )

  return (
    <JotaiProvider>
      <DockingProvider manager={dockingManager} availableContents={availableContents}>
        {({ manager, isAnyPanelMaximized }) => {
          const state = manager.getState()
          const maximizedPanel = manager.getMaximizedPanel()
          const isMaximized = isAnyPanelMaximized()

          // Fullscreen maximized view
          if (isMaximized && maximizedPanel) {
            return (
              <div className='h-screen bg-background text-foreground'>
                <DockPanel node={maximizedPanel} instanceId={state.instanceId} />
              </div>
            )
          }

          // Normal view with header and sidebar
          return (
            <div className='h-screen flex flex-col bg-background text-foreground'>
              <Header />

              <div className='flex-1 flex overflow-hidden'>
                {/* Sidebar */}
                <aside className='w-64 border-r border-border shrink-0'>
                  <Sidebar
                    ref={sidebarRef}
                    onFileOpen={handleFileOpen}
                    onFileRename={handleFileRename}
                    onFileMove={handleFileMove}
                    onFileDelete={handleFileDelete}
                  />
                </aside>

                {/* Main content with docking */}
                <main className='flex-1 overflow-hidden p-2'>
                  <NodeRenderer node={state.root} instanceId={state.instanceId} />
                </main>
              </div>
            </div>
          )
        }}
      </DockingProvider>
    </JotaiProvider>
  )
}

// Helper to find a panel by contentKey
function findPanelByContentKey(
  node: import("@internal/dock").DockNode,
  contentKey: string,
): import("@internal/dock").PanelNode | null {
  if (node.type === "panel") {
    return node.contentKey === contentKey ? node : null
  }
  if (node.type === "tabContainer") {
    for (const panel of node.panels) {
      if (panel.contentKey === contentKey) {
        return panel
      }
    }
    return null
  }
  if (node.type === "container") {
    const inFirst = findPanelByContentKey(node.first, contentKey)
    if (inFirst) return inFirst
    return findPanelByContentKey(node.second, contentKey)
  }
  return null
}
