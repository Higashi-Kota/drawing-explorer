import {
  DockingManager,
  DockingProvider,
  DockPanel,
  NodeRenderer,
  type PanelContent,
  type PanelNode,
} from "@internal/dock"
import type { FileNode } from "@internal/file-tree"
import { Provider as JotaiProvider } from "jotai"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { DrawingCanvas } from "./components/DrawingCanvas"
import { Header } from "./components/Header"
import { Sidebar, type SidebarRef } from "./components/Sidebar"
import type { Stroke } from "./stores/panelState"

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

  // Track open file panels: filePath -> { panelId, name }
  const [filePanels, setFilePanels] = useState<Map<string, { id: string; name: string }>>(new Map())

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
  const handleSaveCanvas = useCallback(
    (panelId: string, _strokes: ReadonlyArray<Stroke>) => {
      // Generate a unique filename
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-")
      const fileName = `drawing-${timestamp}.draw`
      const filePath = fileName

      // Add file to sidebar
      if (sidebarRef.current) {
        sidebarRef.current.addFile(fileName, filePath)
      }

      // Update panel info
      const newPanelId = generatePanelId(filePath)

      // Update filePanels tracking
      setFilePanels((prev) => {
        const newMap = new Map(prev)
        newMap.set(filePath, { id: newPanelId, name: fileName })
        return newMap
      })

      // Update panel title and content key
      dockingManager.updatePanelTitle(panelId, fileName)
      dockingManager.updatePanelContentKey(panelId, filePath)

      // Mark as saved (remove from unsaved)
      setUnsavedPanels((prev) => {
        const newSet = new Set(prev)
        newSet.delete(panelId)
        return newSet
      })

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
      content: (
        <DrawingCanvas
          panelId='new-canvas'
          fileName='Untitled'
          isUnsaved
          onSave={handleSaveCanvas}
        />
      ),
    })

    // Add file panel contents with panelId for state management
    filePanels.forEach(({ id: panelId, name }, path) => {
      contents.push({
        key: path,
        label: name,
        content: <DrawingCanvas panelId={panelId} fileName={name} />,
      })
    })

    return contents
  }, [filePanels, handleSaveCanvas])

  // Handle file open from sidebar
  const handleFileOpen = useCallback(
    (file: FileNode) => {
      // Check if file is already open by checking existing panels
      const state = dockingManager.getState()
      const existingPanel = findPanelByContentKey(state.root, file.path)

      if (existingPanel) {
        // Activate existing panel
        dockingManager.activatePanel(existingPanel.id)
        forceUpdate({})
        return
      }

      // Generate stable panel ID from file path
      const panelId = generatePanelId(file.path)

      // Add file to panel tracking
      setFilePanels((prev) => {
        const newMap = new Map(prev)
        newMap.set(file.path, { id: panelId, name: file.name })
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

      // Update filePanels map
      setFilePanels((prev) => {
        const newMap = new Map(prev)
        newMap.delete(oldPath)
        newMap.set(newPath, { id: panelInfo.id, name: newName })
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

      // Update filePanels map with new path
      setFilePanels((prev) => {
        const newMap = new Map(prev)
        newMap.delete(oldPath)
        newMap.set(newPath, { id: panelInfo.id, name: panelInfo.name })
        return newMap
      })

      forceUpdate({})
    },
    [dockingManager, filePanels],
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
