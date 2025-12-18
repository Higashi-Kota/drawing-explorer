import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine"
import { draggable, dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { pointerOutsideOfPreview } from "@atlaskit/pragmatic-drag-and-drop/element/pointer-outside-of-preview"
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview"
import { GripVertical, Maximize2, Minimize2, X } from "lucide-react"
import React, { useContext, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import invariant from "tiny-invariant"

import type { DndState, DockingPosition, PanelNode } from "../../types"
import { calculateDropPosition, isPanelComponent } from "../../utils"
import { DockingContext } from "../DockingProvider"
import { DropIndicator } from "../DropIndicator"
import { PanelPreview } from "../PanelPreview"

interface DockPanelProps {
  node: PanelNode
  instanceId: symbol
}

export const DockPanel: React.FC<DockPanelProps> = ({ node, instanceId }) => {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const headerRef = useRef<HTMLDivElement | null>(null)
  const dockingContext = useContext(DockingContext)

  const [state, setState] = useState<DndState>({ type: "idle" })
  const [panelDropInfo, setPanelDropInfo] = useState<{
    isOver: boolean
    position: DockingPosition | null
    dropRect: DOMRect | null
  }>({
    isOver: false,
    position: null,
    dropRect: null,
  })

  if (dockingContext == null) {
    throw new Error("DockPanel must be used within a DockingContext")
  }

  const {
    onRemove,
    onMove,
    availableContents,
    onMaximizePanel,
    onRestorePanel,
    isMaximized,
    isAnyPanelMaximized,
  } = dockingContext

  const isPanelMaximized = isMaximized(node.id)
  const currentContentKey = node.contentKey ?? "default"
  const selectedContent = availableContents.find((c) => c.key === currentContentKey)

  const handleMaximizeToggle = () => {
    if (isPanelMaximized) {
      onRestorePanel()
    } else {
      onMaximizePanel(node.id)
    }
  }

  useEffect(() => {
    invariant(headerRef.current != null, "Header element must exist")

    return combine(
      draggable({
        element: headerRef.current,
        getInitialData: () => ({
          type: "panel",
          id: node.id,
          instanceId,
          title: node.title ?? node.id,
        }),
        onGenerateDragPreview({ nativeSetDragImage }) {
          setCustomNativeDragPreview({
            getOffset: pointerOutsideOfPreview({ x: "16px", y: "16px" }),
            render({ container }) {
              setState({ type: "preview", container })
              return () => setState({ type: "idle" })
            },
            nativeSetDragImage,
          })
        },
        onDragStart: () => {
          if (isAnyPanelMaximized()) return false
          setState({ type: "dragging" })
          return true
        },
        onDrop: () => setState({ type: "idle" }),
      }),
    )
  }, [node.id, node.title, instanceId, isAnyPanelMaximized])

  useEffect(() => {
    if (headerRef.current == null) return

    return dropTargetForElements({
      element: headerRef.current,
      getData: () => ({ position: "tab-into", targetId: node.id }),
      canDrop: ({ source }) => {
        return (
          !isAnyPanelMaximized() &&
          source.data.type === "panel" &&
          source.data.id !== node.id &&
          source.data.instanceId === instanceId
        )
      },
      onDragEnter: () => {
        if (isAnyPanelMaximized()) return
        setState({ type: "is-over", position: "tab-into" })
      },
      onDragLeave: () => setState({ type: "idle" }),
      onDrop: ({ source }) => {
        if (isAnyPanelMaximized()) return
        if (source.data.type === "panel") {
          onMove(String(source.data.id), node.id, "tab-into")
        }
        setState({ type: "idle" })
      },
    })
  }, [node.id, instanceId, onMove, isAnyPanelMaximized])

  useEffect(() => {
    invariant(contentRef.current != null, "Content element must exist")

    return dropTargetForElements({
      element: contentRef.current,
      getData({ input, element }) {
        if (element == null || headerRef.current == null || isAnyPanelMaximized()) return {}

        const rect = element.getBoundingClientRect()
        const headerRect = headerRef.current.getBoundingClientRect()

        const position = calculateDropPosition(
          { x: input.clientX, y: input.clientY },
          rect,
          "panel",
          headerRect,
        )

        return { position, targetId: node.id }
      },
      canDrop: ({ source }) => {
        return (
          !isAnyPanelMaximized() &&
          source.data.type === "panel" &&
          source.data.id !== node.id &&
          source.data.instanceId === instanceId
        )
      },
      onDragEnter: ({ self }) => {
        if (isAnyPanelMaximized()) return
        if (contentRef.current == null) return

        const position = self.data.position as DockingPosition

        if (position === "tab-into") {
          setState({ type: "is-over", position })
        } else {
          setPanelDropInfo({
            isOver: true,
            position,
            dropRect: contentRef.current.getBoundingClientRect(),
          })
        }
      },
      onDrag: ({ self }) => {
        if (isAnyPanelMaximized()) return
        if (contentRef.current == null) return

        const position = self.data.position as DockingPosition

        if (position === "tab-into") {
          setState((prev) => {
            if (prev.type !== "is-over" || prev.position !== position) {
              return { type: "is-over", position }
            }
            return prev
          })
        } else {
          setPanelDropInfo((prev) => {
            if (!prev.isOver || prev.position !== position) {
              return {
                isOver: true,
                position,
                dropRect: contentRef.current?.getBoundingClientRect() ?? null,
              }
            }
            return prev
          })
        }
      },
      onDragLeave: () => {
        setPanelDropInfo({ isOver: false, position: null, dropRect: null })
        setState({ type: "idle" })
      },
      onDrop: ({ source, self }) => {
        if (isAnyPanelMaximized()) return
        if (source.data.type === "panel") {
          const position = self.data.position as DockingPosition
          onMove(String(source.data.id), node.id, position)
        }
        setPanelDropInfo({ isOver: false, position: null, dropRect: null })
        setState({ type: "idle" })
      },
    })
  }, [node.id, instanceId, onMove, isAnyPanelMaximized])

  return (
    <article
      ref={panelRef}
      aria-label={node.title ?? node.id}
      className='dock-panel grid grid-rows-[auto_1fr] w-full h-full bg-card border border-border rounded-lg overflow-hidden'
      data-dragging={state.type === "dragging" ? "" : undefined}
      data-maximized={isPanelMaximized ? "" : undefined}
    >
      <div
        ref={headerRef}
        className='dock-panel-header grid grid-cols-[auto_1fr_auto] items-center gap-2 px-2 py-1.5 bg-muted cursor-move border-b border-border'
      >
        <div className='flex items-center gap-2'>
          <GripVertical className='w-4 h-4 text-muted-foreground' aria-hidden='true' />
          <span className='text-sm font-medium truncate'>{node.title ?? node.id}</span>
        </div>
        <div />
        <div className='flex items-center gap-1'>
          <button
            type='button'
            onClick={handleMaximizeToggle}
            className='p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors'
            aria-label={isPanelMaximized ? "Restore panel" : "Maximize panel"}
          >
            {isPanelMaximized ? (
              <Minimize2 className='w-4 h-4' aria-hidden='true' />
            ) : (
              <Maximize2 className='w-4 h-4' aria-hidden='true' />
            )}
          </button>
          <button
            type='button'
            onClick={() => onRemove(node.id)}
            className='p-1 rounded hover:bg-destructive hover:text-destructive-foreground text-muted-foreground transition-colors'
            aria-label='Close panel'
          >
            <X className='w-4 h-4' aria-hidden='true' />
          </button>
        </div>
        {state.type === "is-over" && state.position === "tab-into" && headerRef.current != null && (
          <DropIndicator position='tab-into' rect={headerRef.current.getBoundingClientRect()} />
        )}
      </div>

      {/* key prop ensures React creates new component instance when switching between different files */}
      <div ref={contentRef} className='relative min-h-0 p-3 overflow-hidden'>
        {selectedContent
          ? isPanelComponent(selectedContent.content)
            ? React.cloneElement(selectedContent.content, {
                key: selectedContent.key,
                panelId: node.id,
              })
            : selectedContent.content
          : node.content}
      </div>

      {panelDropInfo.isOver && panelDropInfo.position != null && panelDropInfo.dropRect != null && (
        <DropIndicator position={panelDropInfo.position} rect={panelDropInfo.dropRect} />
      )}

      {state.type === "preview" &&
        createPortal(<PanelPreview title={node.title ?? node.id} />, state.container)}
    </article>
  )
}
