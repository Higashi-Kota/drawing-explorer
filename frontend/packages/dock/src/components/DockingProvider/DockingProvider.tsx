import type React from "react"
import { createContext, useCallback, useEffect, useState } from "react"
import { DockingManager } from "../../core/DockingManager"
import type { DockingContextValue, DockingPosition, DockNode, PanelContent } from "../../types"

export const DockingContext = createContext<DockingContextValue | null>(null)

interface DockingProviderProps {
  children: (contextValue: {
    manager: DockingManager
    handleAddPanelWithContent: (contentKey: string) => void
    isAnyPanelMaximized: () => boolean
    availableContents: PanelContent[]
    newPanelContentKey: string
    handleSelectPanelType: (value: string) => void
  }) => React.ReactNode
  manager?: DockingManager
  initialLayout?: DockNode
  availableContents: PanelContent[]
}

export const DockingProvider: React.FC<DockingProviderProps> = ({
  children,
  manager: externalManager,
  availableContents,
}) => {
  const [newPanelContentKey, setNewPanelContentKey] = useState(
    availableContents[0]?.key ?? "default",
  )

  const [dockingManager] = useState(() => externalManager ?? new DockingManager())
  const [, forceUpdate] = useState({})

  const handleSelectPanelType = useCallback((value: string) => {
    setNewPanelContentKey(value)
  }, [])

  const handleRemovePanel = useCallback(
    (id: string) => {
      dockingManager.removePanel(id)
    },
    [dockingManager],
  )

  const handleEditPanel = useCallback(
    (id: string, content: string) => {
      dockingManager.editPanel(id, content)
    },
    [dockingManager],
  )

  const handleMovePanel = useCallback(
    (sourceId: string, targetId: string, pos: DockingPosition) => {
      dockingManager.movePanel(sourceId, targetId, pos)
    },
    [dockingManager],
  )

  const handleResize = useCallback(
    (nodeId: string, newSize: number) => {
      dockingManager.resizeContainer(nodeId, newSize)
    },
    [dockingManager],
  )

  const handleActivatePanel = useCallback(
    (panelId: string) => {
      dockingManager.activatePanel(panelId)
    },
    [dockingManager],
  )

  const handleAddTab = useCallback(
    (targetId: string) => {
      dockingManager.addTab(targetId)
    },
    [dockingManager],
  )

  const handleUpdateContentKey = useCallback(
    (id: string, contentKey: string) => {
      dockingManager.updatePanelContentKey(id, contentKey)
    },
    [dockingManager],
  )

  const handleMaximizePanel = useCallback(
    (id: string) => {
      dockingManager.maximizePanel(id)
    },
    [dockingManager],
  )

  const handleRestorePanel = useCallback(() => {
    dockingManager.restorePanel()
  }, [dockingManager])

  const isPanelMaximized = useCallback(
    (id: string) => {
      return dockingManager.isPanelMaximized(id)
    },
    [dockingManager],
  )

  const isAnyPanelMaximized = useCallback(() => {
    return dockingManager.isAnyPanelMaximized()
  }, [dockingManager])

  const handleAddPanelWithContent = useCallback(
    (contentKey: string) => {
      dockingManager.addPanel(contentKey)
    },
    [dockingManager],
  )

  useEffect(() => {
    const layoutChangedUnsubscribe = dockingManager.on("layoutChanged", () => {
      forceUpdate({})
    })

    const activePanelChangedUnsubscribe = dockingManager.on("activePanelChanged", () => {
      forceUpdate({})
    })

    const panelEditedUnsubscribe = dockingManager.on("panelEdited", () => {
      forceUpdate({})
    })

    return () => {
      layoutChangedUnsubscribe()
      activePanelChangedUnsubscribe()
      panelEditedUnsubscribe()
    }
  }, [dockingManager])

  const contextValue: DockingContextValue = {
    manager: dockingManager,
    onRemove: handleRemovePanel,
    onEdit: handleEditPanel,
    onMove: handleMovePanel,
    onResize: handleResize,
    onActivatePanel: handleActivatePanel,
    onAddTab: handleAddTab,
    onUpdateContentKey: handleUpdateContentKey,
    onMaximizePanel: handleMaximizePanel,
    onRestorePanel: handleRestorePanel,
    isMaximized: isPanelMaximized,
    isAnyPanelMaximized,
    availableContents: availableContents,
  }

  return (
    <DockingContext.Provider value={contextValue}>
      {children({
        manager: dockingManager,
        handleAddPanelWithContent,
        isAnyPanelMaximized,
        availableContents: availableContents,
        newPanelContentKey,
        handleSelectPanelType,
      })}
    </DockingContext.Provider>
  )
}
