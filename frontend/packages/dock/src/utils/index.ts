import { customAlphabet, customRandom } from "nanoid"
import React from "react"
import type { DockingPosition, TabInfo } from "../types"

// ID Generation utilities
function gnrng(seed: string): () => number {
  let x = 0
  let y = 0
  let z = 0
  let w = 0

  function next() {
    const t = x ^ (x << 11)
    x = y
    y = z
    z = w
    w ^= ((w >>> 19) ^ t ^ (t >>> 8)) >>> 0
    return w / 0x100000000
  }

  for (let k = 0; k < seed.length + 64; k++) {
    x ^= seed.charCodeAt(k) | 0
    next()
  }

  return next
}

const DEFAULT_SIZE = 7
const AVAILABLE_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

export const createId = (size: number = DEFAULT_SIZE) => {
  return `t_${customAlphabet(AVAILABLE_ALPHABET, size)()}`
}

export const createIdBySeed = (seed: string, size: number = DEFAULT_SIZE) => {
  const rng = gnrng(seed)
  const nanoid = customRandom(AVAILABLE_ALPHABET, size, (size) => {
    return new Uint8Array(size).map(() => 256 * rng())
  })
  return `t_${nanoid()}`
}

// Name utilities
const INCREMENT = new RegExp(/\s\((\d+)\)$/)
const INCREMENT_INT = new RegExp(/\d+(?=\)$)/)

export function getName(name: string, others: string[]) {
  const set = new Set(others)
  let result = name
  while (set.has(result)) {
    result = INCREMENT.exec(result)?.[1]
      ? result.replace(INCREMENT_INT, (m) => (+m + 1).toString())
      : `${result} (1)`
  }
  return result
}

// Drop position calculation
export function calculateDropPosition(
  clientOffset: { x: number; y: number },
  rect: DOMRect,
  _targetType: "panel" | "tabContainer" | "container" = "panel",
  headerRect?: DOMRect | null,
): DockingPosition {
  const { x, y } = clientOffset
  const { left, top, width, height } = rect

  if (
    headerRect != null &&
    x >= headerRect.left &&
    x <= headerRect.right &&
    y >= headerRect.top &&
    y <= headerRect.bottom
  ) {
    return "tab-into"
  }

  const distTop = Math.abs(y - top)
  const distBottom = Math.abs(y - (top + height))
  const distLeft = Math.abs(x - left)
  const distRight = Math.abs(x - (left + width))

  const minVal = Math.min(distTop, distBottom, distLeft, distRight)

  if (minVal === distTop) return "top"
  if (minVal === distBottom) return "bottom"
  if (minVal === distLeft) return "left"
  if (minVal === distRight) return "right"

  return "top"
}

export function calculateTabHeaderDropPosition(
  clientX: number,
  tabElements: TabInfo[],
  _containerRect: DOMRect,
): { position: DockingPosition; targetId: string } {
  if (tabElements.length === 0) {
    return { position: "tab-into", targetId: "" }
  }

  const sortedTabs = [...tabElements].sort((a, b) => {
    const rectA = a.element.getBoundingClientRect()
    const rectB = b.element.getBoundingClientRect()
    return rectA.left - rectB.left
  })

  const firstTabRect = sortedTabs[0].element.getBoundingClientRect()
  if (clientX < firstTabRect.left) {
    return { position: "tab-before", targetId: sortedTabs[0].id }
  }

  const lastTabRect = sortedTabs[sortedTabs.length - 1].element.getBoundingClientRect()
  if (clientX > lastTabRect.right) {
    return {
      position: "tab-after",
      targetId: sortedTabs[sortedTabs.length - 1].id,
    }
  }

  for (let i = 0; i < sortedTabs.length; i++) {
    const tab = sortedTabs[i]
    const rect = tab.element.getBoundingClientRect()

    if (clientX >= rect.left && clientX <= rect.right) {
      if (clientX < rect.left + rect.width / 3) {
        return { position: "tab-before", targetId: tab.id }
      }

      if (clientX > rect.left + (rect.width * 2) / 3) {
        if (i === sortedTabs.length - 1) {
          return { position: "tab-after", targetId: tab.id }
        }
        return { position: "tab-before", targetId: sortedTabs[i + 1].id }
      }

      return { position: "tab-into", targetId: tab.id }
    }

    if (i < sortedTabs.length - 1) {
      const nextTab = sortedTabs[i + 1]
      const nextRect = nextTab.element.getBoundingClientRect()

      if (clientX > rect.right && clientX < nextRect.left) {
        const midpoint = (rect.right + nextRect.left) / 2
        if (clientX < midpoint) {
          return { position: "tab-after", targetId: tab.id }
        }
        return { position: "tab-before", targetId: nextTab.id }
      }
    }
  }

  return {
    position: "tab-after",
    targetId: sortedTabs[sortedTabs.length - 1].id,
  }
}

/**
 * Calculate drop position for a single tab
 */
export function calculateTabDropPositionForSingleTab(
  clientOffset: { x: number; y: number } | null,
  tabElement: HTMLElement | null,
  containerRect?: DOMRect | null,
): DockingPosition | null {
  if (clientOffset == null || tabElement == null) return null

  const { x, y } = clientOffset
  const tabRect = tabElement.getBoundingClientRect()

  // If container rect is provided, check for top/right/bottom/left split
  if (containerRect != null) {
    // Calculate distance to each edge
    const distLeft = Math.abs(x - containerRect.left)
    const distRight = Math.abs(x - (containerRect.left + containerRect.width))
    const distTop = Math.abs(y - containerRect.top)
    const distBottom = Math.abs(y - (containerRect.top + containerRect.height))

    // Edge threshold and tab distance threshold
    const edgeThreshold = 20
    const tabDistThreshold = 30

    // Distance from tab center
    const tabCenterX = tabRect.left + tabRect.width / 2
    const tabCenterY = tabRect.top + tabRect.height / 2
    const tabDistX = Math.abs(x - tabCenterX)
    const tabDistY = Math.abs(y - tabCenterY)

    // If far from tab and close to container edge
    if (tabDistX > tabDistThreshold || tabDistY > tabDistThreshold) {
      const minEdgeDist = Math.min(distLeft, distRight, distTop, distBottom)

      if (minEdgeDist < edgeThreshold) {
        if (minEdgeDist === distLeft) return "left"
        if (minEdgeDist === distRight) return "right"
        if (minEdgeDist === distTop) return "top"
        if (minEdgeDist === distBottom) return "bottom"
      }
    }
  }

  // Normal tab position calculation (within the tab)
  const { left, width } = tabRect

  // Left 1/3 of tab
  if (x < left + width / 3) {
    return "tab-before"
  }

  // Right 1/3 of tab
  if (x > left + (width * 2) / 3) {
    return "tab-after"
  }

  // Middle of tab
  return "tab-into"
}

interface PanelProps {
  panelId?: string
}

export function isPanelComponent(
  component: React.ReactNode,
): component is React.ReactElement<PanelProps> {
  if (!React.isValidElement(component)) return false
  const props = component.props as Record<string, unknown>
  return props["data-component"] === "panel"
}
