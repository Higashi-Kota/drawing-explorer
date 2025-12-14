import type { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge"
import type React from "react"
import type { DockingManager } from "../core/DockingManager"

export type DockingPosition =
  | "top"
  | "right"
  | "bottom"
  | "left"
  | "tab-before"
  | "tab-after"
  | "tab-into"

export interface PanelNode {
  id: string
  type: "panel"
  title?: string
  content: React.ReactNode
  contentKey: string
}

export interface ContainerNode {
  id: string
  type: "container"
  splitDirection: "horizontal" | "vertical"
  first: DockNode
  second: DockNode
  size: number
}

export interface TabContainerNode {
  id: string
  type: "tabContainer"
  panels: PanelNode[]
  activeId?: string
}

export type DockNode = PanelNode | ContainerNode | TabContainerNode

export interface DockingState {
  root: DockNode
  activePanels: { [key: string]: string }
  instanceId: symbol
  maximizedPanelId: string | null
}

export type DndState =
  | { type: "idle" }
  | { type: "dragging" }
  | { type: "preview"; container: HTMLElement }
  | { type: "is-over"; position: DockingPosition; closestEdge?: Edge | null }

export interface TabInfo {
  id: string
  element: HTMLElement
  index: number
}

export interface PanelContent {
  key: string
  label: string
  content: React.ReactNode
}

export interface DockingContextValue {
  manager: DockingManager
  onRemove: (id: string) => void
  onEdit: (id: string, content: string) => void
  onMove: (sourceId: string, targetId: string, pos: DockingPosition) => void
  onResize: (nodeId: string, newSize: number) => void
  onActivatePanel: (id: string) => void
  onAddTab: (targetId: string) => void
  onUpdateContentKey: (id: string, contentKey: string) => void
  availableContents: PanelContent[]
  onMaximizePanel: (id: string) => void
  onRestorePanel: () => void
  isMaximized: (id: string) => boolean
  isAnyPanelMaximized: () => boolean
}
