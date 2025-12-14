import type { DropPosition, DropTarget } from "../types"

/**
 * Drag & drop state
 */
interface DragDropState {
  readonly draggingPaths: ReadonlyArray<string>
  readonly dropTarget: DropTarget | null
  readonly mousePosition: { readonly x: number; readonly y: number } | null
}

/**
 * Drop zone ratio (for folders)
 * From top: before(30%), inside(40%), after(30%)
 */
const DROP_ZONE_RATIO = 0.3

/**
 * DragDropManager - Immutable drag & drop state management class
 *
 * Manages drag & drop operations for file explorer.
 * Can be used by both tree view and grid view.
 */
export class DragDropManager {
  private constructor(private readonly _state: DragDropState | null) {}

  static initial(): DragDropManager {
    return new DragDropManager(null)
  }

  get isDragging(): boolean {
    return this._state !== null
  }

  get draggingPaths(): ReadonlyArray<string> {
    return this._state?.draggingPaths ?? []
  }

  get dropTarget(): DropTarget | null {
    return this._state?.dropTarget ?? null
  }

  get mousePosition(): { readonly x: number; readonly y: number } | null {
    return this._state?.mousePosition ?? null
  }

  startDrag(paths: ReadonlyArray<string>): DragDropManager {
    if (paths.length === 0) {
      return this
    }
    return new DragDropManager({
      draggingPaths: paths,
      dropTarget: null,
      mousePosition: null,
    })
  }

  updateDropTarget(target: DropTarget | null): DragDropManager {
    if (!this._state) {
      return this
    }
    return new DragDropManager({
      ...this._state,
      dropTarget: target,
    })
  }

  updateMousePosition(x: number, y: number): DragDropManager {
    if (!this._state) {
      return this
    }
    return new DragDropManager({
      ...this._state,
      mousePosition: { x, y },
    })
  }

  endDrag(): DragDropManager {
    return new DragDropManager(null)
  }

  isPathDragging(path: string): boolean {
    return this._state?.draggingPaths.includes(path) ?? false
  }

  isDropTarget(path: string): boolean {
    return this._state?.dropTarget?.path === path
  }

  /**
   * Calculate drop position
   * @param clientY Mouse Y coordinate (client coordinate)
   * @param rect Target element's DOMRect
   * @param isFolder Whether target is a folder
   */
  static calculateDropPosition(clientY: number, rect: DOMRect, isFolder: boolean): DropPosition {
    const relativeY = clientY - rect.top
    const ratio = relativeY / rect.height

    // For files: before/after only (50/50 split)
    if (!isFolder) {
      return ratio < 0.5 ? "before" : "after"
    }

    // For folders: before/inside/after (30%/40%/30% split)
    if (ratio < DROP_ZONE_RATIO) {
      return "before"
    }
    if (ratio > 1 - DROP_ZONE_RATIO) {
      return "after"
    }
    return "inside"
  }

  /**
   * Validate if drop is possible
   */
  static validateDrop(
    sourcePaths: ReadonlyArray<string>,
    targetPath: string,
    position: DropPosition,
    isTargetFolder: boolean,
    getDescendants: (path: string) => ReadonlyArray<string>,
  ): boolean {
    // Cannot drop onto self
    if (sourcePaths.includes(targetPath)) {
      return false
    }

    // Cannot drop inside a file
    if (position === "inside" && !isTargetFolder) {
      return false
    }

    // Cannot drop into own descendants (prevent circular reference)
    for (const sourcePath of sourcePaths) {
      const descendants = getDescendants(sourcePath)
      if (descendants.includes(targetPath)) {
        return false
      }
    }

    return true
  }
}
