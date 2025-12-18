import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { Maximize2, Minimize2 } from "lucide-react"
import React, { useCallback, useContext, useEffect, useRef, useState } from "react"
import invariant from "tiny-invariant"

import type { DndState, DockingPosition, TabContainerNode, TabInfo } from "../../types"
import {
  calculateDropPosition,
  calculateTabHeaderDropPosition,
  isPanelComponent,
} from "../../utils"
import { DockingContext } from "../DockingProvider"
import { DockTabLabel } from "../DockTabLabel"
import { DropIndicator } from "../DropIndicator"
import { TabDropIndicator } from "../TabDropIndicator"

interface DockTabContainerProps {
  node: TabContainerNode
  instanceId: symbol
}

export const DockTabContainer: React.FC<DockTabContainerProps> = ({ node, instanceId }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const tabsHeaderRef = useRef<HTMLDivElement>(null)
  const [tabElements, setTabElements] = useState<TabInfo[]>([])
  const [state, setState] = useState<DndState>({ type: "idle" })
  const [tabHeaderDropInfo, setTabHeaderDropInfo] = useState<{
    position: DockingPosition
    targetId: string
  } | null>(null)
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null)

  const dockingContext = useContext(DockingContext)

  if (dockingContext == null) {
    throw new Error("DockTabContainer must be used within a DockingContext")
  }

  const {
    manager,
    onMove,
    availableContents,
    isAnyPanelMaximized,
    onMaximizePanel,
    onRestorePanel,
    isMaximized,
  } = dockingContext

  const activePanels = manager.getActivePanels()

  // Save container size
  useEffect(() => {
    if (containerRef.current != null) {
      setContainerRect(containerRef.current.getBoundingClientRect())
    }
  }, [])

  // Sort tab elements by position
  const sortedTabElements = [...tabElements].sort((a, b) => a.index - b.index)

  // Tab element registration function
  const registerTabElement = useCallback((id: string, element: HTMLElement, index: number) => {
    setTabElements((prev) => {
      // Remove existing
      const filtered = prev.filter((tab) => tab.id !== id)
      // Add new
      return [...filtered, { id, element, index }]
    })
  }, [])

  // Tab container drop target integration
  useEffect(() => {
    invariant(containerRef.current != null, "Tab container element must exist")

    return dropTargetForElements({
      element: containerRef.current,
      getData({ input, element }) {
        if (element == null || isAnyPanelMaximized()) return {}

        const containerRect = element.getBoundingClientRect()
        const headerRect = tabsHeaderRef.current?.getBoundingClientRect() ?? null

        // First determine top/bottom/left/right or tab-into broadly
        const position = calculateDropPosition(
          { x: input.clientX, y: input.clientY },
          containerRect,
          "tabContainer",
          headerRect,
        )

        // If over header (tab-into), check individual tab positions
        if (position === "tab-into" && headerRect != null) {
          const dropInfo = calculateTabHeaderDropPosition(
            input.clientX,
            sortedTabElements,
            headerRect,
          )
          return {
            position: dropInfo.position, // tab-before, tab-after, tab-into
            targetId: dropInfo.targetId ?? node.id,
          }
        }

        return { position, targetId: node.id }
      },
      canDrop: ({ source }) => {
        // Disable during maximized
        if (isAnyPanelMaximized()) return false

        // Ignore self-drop of the only tab
        const isOwnTab = node.panels.some((p) => p.id === source.data.id)
        return (
          source.data.type === "panel" &&
          !(isOwnTab && node.panels.length <= 1) &&
          source.data.instanceId === instanceId
        )
      },
      onDragEnter: ({ self }) => {
        if (isAnyPanelMaximized()) return
        const position = self.data.position as DockingPosition
        const targetId = self.data.targetId as string
        if (position != null) {
          setState({
            type: "is-over",
            position,
          })

          if (position === "tab-before" || position === "tab-after" || position === "tab-into") {
            setTabHeaderDropInfo({ position, targetId })
          } else {
            setTabHeaderDropInfo(null)
          }
        }
      },
      onDrag: ({ self }) => {
        if (isAnyPanelMaximized()) return
        const position = self.data.position as DockingPosition
        const targetId = self.data.targetId as string
        if (position != null) {
          setState((prev) => {
            if (prev.type !== "is-over" || prev.position !== position) {
              return { type: "is-over", position }
            }
            return prev
          })

          if (position === "tab-before" || position === "tab-after" || position === "tab-into") {
            setTabHeaderDropInfo({ position, targetId })
          } else {
            setTabHeaderDropInfo(null)
          }
        }
      },
      onDragLeave: () => {
        setState({ type: "idle" })
        setTabHeaderDropInfo(null)
      },
      onDrop: ({ source, self }) => {
        if (isAnyPanelMaximized()) return
        if (source.data.type === "panel") {
          const position = self.data.position as DockingPosition
          const targetId = self.data.targetId as string
          onMove(String(source.data.id), targetId, position)
        }
        setState({ type: "idle" })
        setTabHeaderDropInfo(null)
      },
    })
  }, [node.id, node.panels, sortedTabElements, instanceId, onMove, isAnyPanelMaximized])

  // Determine active panel ID
  const activeId = node.activeId ?? activePanels[node.id] ?? node.panels[0]?.id

  // Get active panel content
  const activePanel = node.panels.find((p) => p.id === activeId)
  const activePanelContentKey = activePanel?.contentKey ?? "default"
  const selectedContent = availableContents.find((c) => c.key === activePanelContentKey)

  // Check if panel is maximized
  const isPanelMaximized = activePanel != null && isMaximized(activePanel.id)

  // Maximize/restore toggle
  const handleMaximizeToggle = () => {
    if (isPanelMaximized) {
      onRestorePanel()
    } else if (activePanel != null) {
      onMaximizePanel(activePanel.id)
    }
  }

  return (
    <div
      ref={containerRef}
      role='tabpanel'
      aria-label='Tab container'
      className='dock-tab-container relative grid grid-rows-[auto_1fr] w-full h-full bg-card border border-border rounded-lg overflow-hidden'
    >
      {/* Tab bar */}
      <div
        ref={tabsHeaderRef}
        role='tablist'
        aria-label='Panel tabs'
        className='flex items-end gap-0.5 px-1 pt-0.5 bg-muted border-b border-border overflow-x-auto overflow-y-hidden scrollbar-none'
      >
        {node.panels.map((p, index) => {
          const isPanelActive = p.id === activeId
          return (
            <DockTabLabel
              key={p.id}
              panel={p}
              isActive={isPanelActive}
              tabIndex={index}
              instanceId={instanceId}
              containerRect={containerRect}
              registerTabElement={registerTabElement}
              onContainerDrop={(panelId, pos) => onMove(panelId, node.id, pos)}
            />
          )
        })}

        {/* Spacer to push buttons to the right */}
        <div className='flex-1 min-w-2' />

        {/* Maximize/Restore button */}
        <button
          type='button'
          onClick={handleMaximizeToggle}
          className='p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors'
          aria-label={isPanelMaximized ? "Restore panel" : "Maximize panel"}
          aria-pressed={isPanelMaximized}
          disabled={activePanel == null}
        >
          {isPanelMaximized ? (
            <Minimize2 className='w-4 h-4' aria-hidden='true' />
          ) : (
            <Maximize2 className='w-4 h-4' aria-hidden='true' />
          )}
        </button>
      </div>

      <div ref={contentRef} className='relative min-h-0 p-2 overflow-hidden'>
        {/* Show selected content */}
        {/* key prop ensures React creates new component instance when switching between different files */}
        {activePanel &&
          (selectedContent
            ? isPanelComponent(selectedContent.content)
              ? React.cloneElement(selectedContent.content, {
                  key: selectedContent.key,
                  panelId: activePanel.id,
                })
              : selectedContent.content
            : activePanel.content)}
      </div>

      {/* Drop indicator (top/right/bottom/left) */}
      {state.type === "is-over" &&
        containerRef.current != null &&
        (state.position === "top" ||
          state.position === "right" ||
          state.position === "bottom" ||
          state.position === "left") && (
          <DropIndicator
            position={state.position}
            rect={containerRef.current.getBoundingClientRect()}
          />
        )}

      {/* Tab drop indicator (tab-before / tab-after) */}
      {state.type === "is-over" &&
        tabHeaderDropInfo != null &&
        (tabHeaderDropInfo.position === "tab-before" ||
          tabHeaderDropInfo.position === "tab-after") &&
        sortedTabElements.map((tab) => {
          if (tab.id === tabHeaderDropInfo.targetId) {
            return (
              <TabDropIndicator
                key={`drop-${tab.id}`}
                position={tabHeaderDropInfo.position}
                targetRect={tab.element.getBoundingClientRect()}
              />
            )
          }
          return null
        })}
    </div>
  )
}
