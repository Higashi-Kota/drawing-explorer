import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine"
import { draggable, dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { pointerOutsideOfPreview } from "@atlaskit/pragmatic-drag-and-drop/element/pointer-outside-of-preview"
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview"
import { X } from "lucide-react"
import type React from "react"
import { useContext, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import invariant from "tiny-invariant"

import type { DndState, DockingPosition, PanelNode } from "../../types"
import { calculateTabDropPositionForSingleTab } from "../../utils"
import { DockingContext } from "../DockingProvider"
import { TabDropIndicator } from "../TabDropIndicator"
import { TabPreview } from "../TabPreview"

interface DockTabLabelProps {
  panel: PanelNode
  isActive: boolean
  tabIndex: number
  instanceId: symbol
  containerRect: DOMRect | null
  registerTabElement: (id: string, element: HTMLElement, index: number) => void
  onContainerDrop?: (panelId: string, position: DockingPosition) => void
}

export const DockTabLabel: React.FC<DockTabLabelProps> = ({
  panel,
  isActive,
  tabIndex,
  instanceId,
  containerRect,
  registerTabElement,
  onContainerDrop,
}) => {
  const tabRef = useRef<HTMLDivElement>(null)
  const dockingContext = useContext(DockingContext)
  const [state, setState] = useState<DndState>({ type: "idle" })

  if (dockingContext == null) {
    throw new Error("DockTabLabel must be used within a DockingContext")
  }

  const { onRemove, onActivatePanel, onMove, isAnyPanelMaximized } = dockingContext

  // Register tab element
  useEffect(() => {
    if (tabRef.current != null) {
      registerTabElement(panel.id, tabRef.current, tabIndex)
    }
  }, [panel.id, tabIndex, registerTabElement])

  // Draggable and drop target setup
  useEffect(() => {
    invariant(tabRef.current != null, "Tab element must exist")

    return combine(
      draggable({
        element: tabRef.current,
        getInitialData: () => ({
          type: "panel",
          id: panel.id,
          instanceId,
          title: panel.title ?? panel.id,
          isTab: true,
        }),
        onGenerateDragPreview({ nativeSetDragImage }) {
          setCustomNativeDragPreview({
            getOffset: pointerOutsideOfPreview({
              x: "16px",
              y: "16px",
            }),
            render({ container }) {
              setState({ type: "preview", container })
              return () => setState({ type: "idle" })
            },
            nativeSetDragImage,
          })
        },
        onDragStart: () => {
          // Disable dragging when maximized
          if (isAnyPanelMaximized()) return false
          setState({ type: "dragging" })
          return true
        },
        onDrop: () => setState({ type: "idle" }),
      }),
      dropTargetForElements({
        element: tabRef.current,
        getData({ input, element }) {
          if (element == null || isAnyPanelMaximized()) return {}

          // Consider container-wide splits if container rect is provided
          const position = calculateTabDropPositionForSingleTab(
            { x: input.clientX, y: input.clientY },
            element as HTMLElement,
            containerRect,
          )

          return { position, targetId: panel.id }
        },
        canDrop: ({ source }) => {
          return (
            !isAnyPanelMaximized() &&
            source.data.type === "panel" &&
            source.data.id !== panel.id &&
            source.data.instanceId === instanceId
          )
        },
        onDragEnter: ({ self }) => {
          if (isAnyPanelMaximized()) return
          const position = self.data.position as DockingPosition
          if (position != null) {
            setState({
              type: "is-over",
              position,
            })
          }
        },
        onDrag: ({ self }) => {
          if (isAnyPanelMaximized()) return
          const position = self.data.position as DockingPosition
          if (position != null) {
            setState((prev) => {
              if (prev.type !== "is-over" || prev.position !== position) {
                return {
                  type: "is-over",
                  position,
                }
              }
              return prev
            })
          }
        },
        onDragLeave: () => {
          setState({ type: "idle" })
        },
        onDrop: ({ source, self }) => {
          if (isAnyPanelMaximized()) return
          if (source.data.type === "panel") {
            const position = self.data.position as DockingPosition

            if (position != null) {
              // Handle as container drop for top/right/bottom/left
              if (
                ["top", "right", "bottom", "left"].includes(position) &&
                onContainerDrop != null
              ) {
                onContainerDrop(String(source.data.id), position)
              } else {
                // Handle as tab operation
                onMove(String(source.data.id), panel.id, position)
              }
            }
          }
          setState({ type: "idle" })
        },
      }),
    )
  }, [
    panel.id,
    panel.title,
    instanceId,
    onMove,
    containerRect,
    onContainerDrop,
    isAnyPanelMaximized,
  ])

  return (
    <div
      ref={tabRef}
      role='tab'
      tabIndex={isActive ? 0 : -1}
      aria-selected={isActive}
      aria-controls={`panel-${panel.id}`}
      onClick={() => onActivatePanel(panel.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onActivatePanel(panel.id)
        }
      }}
      className={`
        group flex items-center gap-1 px-2.5 py-1 text-sm cursor-pointer relative
        rounded-t-md border border-b-0 transition-colors select-none
        ${
          isActive
            ? "bg-card border-border text-foreground -mb-px"
            : "bg-muted border-transparent text-muted-foreground hover:text-foreground hover:bg-accent"
        }
        ${state.type === "dragging" ? "opacity-50" : ""}
      `}
      data-tab-index={tabIndex}
    >
      <span className='truncate max-w-[120px]'>{panel.title ?? panel.id}</span>
      {isActive && (
        <button
          type='button'
          onClick={(e) => {
            e.stopPropagation()
            onRemove(panel.id)
          }}
          className='p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground transition-all'
          aria-label={`Close ${panel.title ?? panel.id}`}
        >
          <X className='w-3 h-3' />
        </button>
      )}

      {/* Drop indicator */}
      {state.type === "is-over" && tabRef.current != null && (
        <TabDropIndicator
          position={state.position}
          targetRect={tabRef.current.getBoundingClientRect()}
        />
      )}

      {/* Drag preview */}
      {state.type === "preview" &&
        createPortal(<TabPreview title={panel.title ?? panel.id} />, state.container)}
    </div>
  )
}
