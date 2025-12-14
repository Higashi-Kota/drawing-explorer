// Core

// Components
export { Divider } from "./components/Divider"
export { DockingContext, DockingProvider } from "./components/DockingProvider"
export { DockPanel } from "./components/DockPanel"
export { DockTabContainer } from "./components/DockTabContainer"
export { DockTabLabel } from "./components/DockTabLabel"
export { DropIndicator } from "./components/DropIndicator"
export { NodeRenderer } from "./components/NodeRenderer"
export { PanelPreview } from "./components/PanelPreview"
export { TabDropIndicator } from "./components/TabDropIndicator"
export { TabPreview } from "./components/TabPreview"
export { DockingManager } from "./core/DockingManager"

// Types
export type {
  ContainerNode,
  DndState,
  DockingContextValue,
  DockingPosition,
  DockingState,
  DockNode,
  PanelContent,
  PanelNode,
  TabContainerNode,
  TabInfo,
} from "./types"

// Utils
export {
  calculateDropPosition,
  calculateTabDropPositionForSingleTab,
  calculateTabHeaderDropPosition,
  createId,
  createIdBySeed,
  getName,
  isPanelComponent,
} from "./utils"
