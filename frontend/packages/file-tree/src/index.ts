// Core

export type { ContextMenuAction } from "./components/ContextMenu"
// Components
export {
  ContextMenu,
  getFileContextActions,
  getFolderContextActions,
} from "./components/ContextMenu"
export { DeleteConfirmModal } from "./components/DeleteConfirmModal"
export { DragPreview } from "./components/DragPreview"
export { DropIndicator } from "./components/DropIndicator"
export { InlineInput } from "./components/InlineInput"
export type { TreeItemDragCallbacks } from "./components/TreeItem"
export { TreeItem } from "./components/TreeItem"
export { TreeView } from "./components/TreeView"
export { DragDropManager } from "./core/DragDropManager"
export { createFileTreeManager, FileTreeManager } from "./core/FileTreeManager"

// Types
export type {
  BaseNode,
  ContextMenuState,
  DropPosition,
  DropTarget,
  EditingState,
  EditingType,
  FileData,
  FileNode,
  FolderNode,
  TreeNode,
} from "./types"
export {
  getParentPath,
  isRootPath,
  pathToSegments,
  ROOT_PATH,
  segmentsToPath,
} from "./types"

// Utils
export {
  createId,
  formatFileSize,
  getFileExtension,
  getFileType,
  sortForTreeView,
} from "./utils"
