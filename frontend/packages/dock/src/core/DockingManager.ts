import { createNanoEvents, type Emitter } from "nanoevents"
import type {
  ContainerNode,
  DockingPosition,
  DockingState,
  DockNode,
  PanelNode,
  TabContainerNode,
} from "../types"
import { createIdBySeed, getName } from "../utils"

interface DockingManagerEvents {
  panelAdded: (panel: PanelNode, state: DockingState) => void
  panelRemoved: (panelId: string, state: DockingState) => void
  panelEdited: (panel: PanelNode, state: DockingState) => void
  panelMoved: (
    sourceId: string,
    targetId: string,
    position: DockingPosition,
    state: DockingState,
  ) => void
  resize: (nodeId: string, newSize: number, state: DockingState) => void
  activePanelChanged: (panelId: string, tabContainerId: string, state: DockingState) => void
  layoutChanged: (state: DockingState) => void
  panelMaximized: (panelId: string, state: DockingState) => void
  panelRestored: (state: DockingState) => void
}

export class DockingManager {
  private state: DockingState
  private emitter: Emitter<DockingManagerEvents>

  constructor(initialLayout?: DockNode) {
    this.state = {
      root: initialLayout ?? this.createInitialLayout(),
      activePanels: {},
      instanceId: Symbol("docking-ui"),
      maximizedPanelId: null,
    }
    this.state.activePanels = this.recalcActivePanels(this.state.root)
    this.emitter = createNanoEvents<DockingManagerEvents>()
  }

  public on<E extends keyof DockingManagerEvents>(
    event: E,
    handler: DockingManagerEvents[E],
  ): () => void {
    return this.emitter.on(event, handler)
  }

  private emit<E extends keyof DockingManagerEvents>(
    event: E,
    ...args: Parameters<DockingManagerEvents[E]>
  ): void {
    this.emitter.emit(event, ...args)
  }

  public getState(): DockingState {
    return { ...this.state }
  }

  public getInstanceId(): symbol {
    return this.state.instanceId
  }

  public getRoot(): DockNode {
    return this.state.root
  }

  public getActivePanels(): { [key: string]: string } {
    return { ...this.state.activePanels }
  }

  public getNode(id: string): DockNode | null {
    return this.findNodeById(this.state.root, id)
  }

  public getMaximizedPanelId(): string | null {
    return this.state.maximizedPanelId
  }

  public getMaximizedPanel(): PanelNode | null {
    if (this.state.maximizedPanelId == null) return null
    const node = this.findNodeById(this.state.root, this.state.maximizedPanelId)
    if (node?.type === "panel") return node
    return null
  }

  public isPanelMaximized(panelId: string): boolean {
    return this.state.maximizedPanelId === panelId
  }

  public isAnyPanelMaximized(): boolean {
    return this.state.maximizedPanelId !== null
  }

  public addPanel(contentKey?: string, title?: string): PanelNode {
    const newPanel = this.createPanelItem(this.state.root, title, "New Panel", contentKey)

    let updatedTree: DockNode
    const rootNode = this.state.root

    if (rootNode.type === "panel") {
      updatedTree = {
        id: createIdBySeed(`container-${rootNode.id}`),
        type: "container",
        splitDirection: "horizontal",
        first: { ...rootNode },
        second: { ...newPanel },
        size: 0.5,
      }
    } else if (rootNode.type === "container") {
      const newContainer: ContainerNode = {
        id: createIdBySeed(`container-${rootNode.second.id}`),
        type: "container",
        splitDirection: "vertical",
        first: { ...rootNode.second },
        second: { ...newPanel },
        size: 0.5,
      }
      updatedTree = this.replaceNode(rootNode, rootNode.second.id, newContainer)
    } else if (rootNode.type === "tabContainer") {
      updatedTree = {
        ...rootNode,
        panels: [...rootNode.panels, newPanel],
        activeId: newPanel.id,
      }
    } else {
      return newPanel
    }

    updatedTree = this.rebalanceTree(updatedTree)
    const optimized = this.optimizeTreeStructure(updatedTree)
    updatedTree = optimized ?? updatedTree

    const activePanels = this.recalcActivePanels(updatedTree, this.state.activePanels)

    this.state = {
      ...this.state,
      root: updatedTree,
      activePanels,
    }

    this.emit("panelAdded", newPanel, this.getState())
    this.emit("layoutChanged", this.getState())

    return newPanel
  }

  public addTab(targetId: string, contentKey?: string, title?: string): PanelNode | null {
    const targetNode = this.findNodeById(this.state.root, targetId)
    if (!targetNode) return null

    const newPanel = this.createPanelItem(this.state.root, title, "New Tab", contentKey)

    if (targetNode.type === "tabContainer") {
      const updated = this.addToExistingTabGroup(this.state.root, targetNode.id, newPanel)
      this.state = { ...this.state, root: updated }
      this.emit("panelAdded", newPanel, this.getState())
      this.emit("layoutChanged", this.getState())
      return newPanel
    }

    if (targetNode.type === "panel") {
      const updated = this.createTabGroup(this.state.root, targetNode.id, newPanel)
      const activePanels = this.recalcActivePanels(updated, this.state.activePanels)
      this.state = { ...this.state, root: updated, activePanels }
      this.emit("panelAdded", newPanel, this.getState())
      this.emit("layoutChanged", this.getState())
      return newPanel
    }

    return null
  }

  public removePanel(id: string): boolean {
    const nodeToRemove = this.findNodeById(this.state.root, id)
    if (!nodeToRemove) return false

    if (this.state.maximizedPanelId === id) {
      this.state = { ...this.state, maximizedPanelId: null }
    }

    const { newTree: removed, updatedActivePanels } = this.removeNodeFromTree(
      this.state.root,
      id,
      this.state.activePanels,
    )

    if (!removed) return false

    const rebalanced = this.rebalanceTree(removed)
    const activePanels = this.recalcActivePanels(rebalanced, updatedActivePanels)

    this.state = { ...this.state, root: rebalanced, activePanels }

    this.emit("panelRemoved", id, this.getState())
    this.emit("layoutChanged", this.getState())

    return true
  }

  public editPanel(id: string, content: string, contentKey?: string): boolean {
    const nodeToEdit = this.findNodeById(this.state.root, id)
    if (!nodeToEdit || nodeToEdit.type !== "panel") return false

    const updated = this.updateNode(this.state.root, id, (node) => {
      if (node.type === "panel") {
        return {
          ...node,
          content,
          contentKey: contentKey !== undefined ? contentKey : node.contentKey,
        }
      }
      return node
    })

    if (!updated) return false

    this.state = { ...this.state, root: updated }
    this.emit("panelEdited", { ...nodeToEdit, content, contentKey } as PanelNode, this.getState())
    return true
  }

  public updatePanelContentKey(id: string, contentKey: string): boolean {
    const nodeToEdit = this.findNodeById(this.state.root, id)
    if (!nodeToEdit || nodeToEdit.type !== "panel") return false

    const updated = this.updateNode(this.state.root, id, (node) => {
      if (node.type === "panel") {
        return { ...node, contentKey }
      }
      return node
    })

    if (!updated) return false

    this.state = { ...this.state, root: updated }
    this.emit("panelEdited", { ...nodeToEdit, contentKey } as PanelNode, this.getState())
    return true
  }

  public updatePanelTitle(id: string, title: string): boolean {
    const nodeToEdit = this.findNodeById(this.state.root, id)
    if (!nodeToEdit || nodeToEdit.type !== "panel") return false

    const updated = this.updateNode(this.state.root, id, (node) => {
      if (node.type === "panel") {
        return { ...node, title }
      }
      return node
    })

    if (!updated) return false

    this.state = { ...this.state, root: updated }
    this.emit("panelEdited", { ...nodeToEdit, title } as PanelNode, this.getState())
    this.emit("layoutChanged", this.getState())
    return true
  }

  public movePanel(sourceId: string, targetId: string, position: DockingPosition): boolean {
    if (this.isAnyPanelMaximized()) return false
    if (sourceId === targetId) return false

    const sourceNode = this.findNodeById(this.state.root, sourceId)
    if (!sourceNode || sourceNode.type !== "panel") return false

    if (position === "tab-before" || position === "tab-after" || position === "tab-into") {
      const targetParentTab = this.getParentTabContainerInTree(this.state.root, targetId)
      const sourceParentTab = this.getParentTabContainerInTree(this.state.root, sourceId)

      if (targetParentTab && sourceParentTab && targetParentTab.id === sourceParentTab.id) {
        const updated = this.reorderTabsInContainer(
          this.state.root,
          targetParentTab.id,
          sourceId,
          targetId,
          position,
        )
        this.state = { ...this.state, root: updated }
        this.emit("panelMoved", sourceId, targetId, position, this.getState())
        this.emit("layoutChanged", this.getState())
        return true
      }

      const { newTree: treeWithoutSource, updatedActivePanels } = this.removeNodeFromTree(
        this.state.root,
        sourceId,
        this.state.activePanels,
      )

      if (!treeWithoutSource) return false

      let updatedTree: DockNode | null = null

      if (targetParentTab) {
        updatedTree = this.insertPanelIntoTabContainer(
          treeWithoutSource,
          targetParentTab.id,
          sourceNode,
          targetId,
          position,
        )
      } else if (targetId && position === "tab-into") {
        updatedTree = this.createTabGroup(treeWithoutSource, targetId, sourceNode)
      } else {
        updatedTree = this.insertPanelAtTarget(treeWithoutSource, targetId, sourceNode, "top")
      }

      updatedTree = this.rebalanceTree(updatedTree)
      const optimized = this.optimizeTreeStructure(updatedTree)
      updatedTree = optimized ?? updatedTree

      const activePanels = this.recalcActivePanels(updatedTree, updatedActivePanels)

      this.state = { ...this.state, root: updatedTree, activePanels }
      this.emit("panelMoved", sourceId, targetId, position, this.getState())
      this.emit("layoutChanged", this.getState())
      return true
    }

    const { newTree: treeWithoutSource, updatedActivePanels } = this.removeNodeFromTree(
      this.state.root,
      sourceId,
      this.state.activePanels,
    )

    if (!treeWithoutSource) return false

    let updatedTree = this.insertPanelAtTarget(treeWithoutSource, targetId, sourceNode, position)
    updatedTree = this.rebalanceTree(updatedTree)
    const optimized = this.optimizeTreeStructure(updatedTree)
    updatedTree = optimized ?? updatedTree

    const activePanels = this.recalcActivePanels(updatedTree, updatedActivePanels)

    this.state = { ...this.state, root: updatedTree, activePanels }
    this.emit("panelMoved", sourceId, targetId, position, this.getState())
    this.emit("layoutChanged", this.getState())
    return true
  }

  public resizeContainer(nodeId: string, newSize: number): boolean {
    if (this.isAnyPanelMaximized()) return false

    const node = this.findNodeById(this.state.root, nodeId)
    if (!node || node.type !== "container") return false

    const updated = this.updateNodeSize(this.state.root, nodeId, newSize)
    this.state = { ...this.state, root: updated }
    this.emit("resize", nodeId, newSize, this.getState())
    this.emit("layoutChanged", this.getState())
    return true
  }

  public activatePanel(panelId: string): boolean {
    const parentTab = this.getParentTabContainerInTree(this.state.root, panelId)
    if (!parentTab) return false

    const updated = this.updateNode(this.state.root, parentTab.id, (node) => {
      if (node.type === "tabContainer") {
        return { ...node, activeId: panelId }
      }
      return node
    })

    if (!updated) return false

    const activePanels = { ...this.state.activePanels, [parentTab.id]: panelId }
    this.state = { ...this.state, root: updated, activePanels }
    this.emit("activePanelChanged", panelId, parentTab.id, this.getState())
    return true
  }

  public maximizePanel(panelId: string): boolean {
    const panel = this.findNodeById(this.state.root, panelId)
    if (!panel || panel.type !== "panel") return false
    if (this.state.maximizedPanelId === panelId) return true

    this.state = { ...this.state, maximizedPanelId: panelId }
    this.emit("panelMaximized", panelId, this.getState())
    this.emit("layoutChanged", this.getState())
    return true
  }

  public restorePanel(): boolean {
    if (!this.state.maximizedPanelId) return false
    this.state = { ...this.state, maximizedPanelId: null }
    this.emit("panelRestored", this.getState())
    this.emit("layoutChanged", this.getState())
    return true
  }

  private createInitialLayout(): DockNode {
    return {
      id: createIdBySeed("initial-panel"),
      type: "panel",
      title: "Welcome",
      content: "Welcome to Drawing Explorer",
      contentKey: "default",
    }
  }

  private createPanelItem(
    existingTree: DockNode | null,
    title?: string,
    _content?: string,
    contentKey?: string,
  ): PanelNode {
    let panelTitle = title

    if (!panelTitle) {
      if (existingTree) {
        const existingNames = this.getPanelNames(existingTree)
        panelTitle = getName("Panel", existingNames)
      } else {
        panelTitle = "Panel"
      }
    }

    return {
      id: createIdBySeed(panelTitle ?? "panel"),
      type: "panel",
      title: panelTitle,
      content: null,
      contentKey: contentKey ?? "default",
    }
  }

  private getPanelNames(node: DockNode): string[] {
    if (node.type === "panel") return [node.title ?? node.id]
    if (node.type === "container")
      return [...this.getPanelNames(node.first), ...this.getPanelNames(node.second)]
    if (node.type === "tabContainer") return node.panels.map((panel) => panel.title ?? panel.id)
    return []
  }

  private findNodeById(root: DockNode, id: string): DockNode | null {
    if (root.id === id) return root

    if (root.type === "container") {
      const firstResult = this.findNodeById(root.first, id)
      if (firstResult) return firstResult
      return this.findNodeById(root.second, id)
    }

    if (root.type === "tabContainer") {
      for (const panel of root.panels) {
        if (panel.id === id) return panel
      }
    }

    return null
  }

  private replaceNode(root: DockNode, targetId: string, newNode: DockNode): DockNode {
    if (root.id === targetId) return { ...newNode }

    if (root.type === "container") {
      return {
        ...root,
        first: this.replaceNode(root.first, targetId, newNode),
        second: this.replaceNode(root.second, targetId, newNode),
      }
    }

    if (root.type === "tabContainer") {
      const panelIndex = root.panels.findIndex((p) => p.id === targetId)
      if (panelIndex !== -1 && newNode.type === "panel") {
        const newPanels = [...root.panels]
        newPanels[panelIndex] = newNode
        return {
          ...root,
          panels: newPanels,
          activeId: root.activeId === targetId ? newNode.id : root.activeId,
        }
      }
    }

    return root
  }

  private removeNodeFromTree(
    root: DockNode,
    removeId: string,
    activePanels: { [key: string]: string } = {},
  ): { newTree: DockNode | null; updatedActivePanels: { [key: string]: string } } {
    const updatedActivePanels = { ...activePanels }

    if (root.id === removeId) return { newTree: null, updatedActivePanels }

    if (root.type === "panel") {
      return { newTree: root.id === removeId ? null : root, updatedActivePanels }
    }

    if (root.type === "container") {
      const { newTree: newFirst, updatedActivePanels: firstActivePanels } = this.removeNodeFromTree(
        root.first,
        removeId,
        updatedActivePanels,
      )
      const { newTree: newSecond, updatedActivePanels: secondActivePanels } =
        this.removeNodeFromTree(root.second, removeId, firstActivePanels)

      if (!newFirst && !newSecond) return { newTree: null, updatedActivePanels: secondActivePanels }
      if (!newFirst) return { newTree: newSecond, updatedActivePanels: secondActivePanels }
      if (!newSecond) return { newTree: newFirst, updatedActivePanels: secondActivePanels }

      return {
        newTree: { ...root, first: newFirst, second: newSecond },
        updatedActivePanels: secondActivePanels,
      }
    }

    if (root.type === "tabContainer") {
      const panelIndex = root.panels.findIndex((p) => p.id === removeId)

      if (panelIndex !== -1) {
        const newPanels = root.panels.filter((p) => p.id !== removeId)

        if (newPanels.length === 0) {
          delete updatedActivePanels[root.id]
          return { newTree: null, updatedActivePanels }
        }

        let activeId = root.activeId
        if (activeId === removeId || !activeId) {
          activeId = newPanels[Math.min(panelIndex, newPanels.length - 1)].id
          updatedActivePanels[root.id] = activeId
        }

        return { newTree: { ...root, panels: newPanels, activeId }, updatedActivePanels }
      }
    }

    return { newTree: root, updatedActivePanels }
  }

  private getParentTabContainerInTree(root: DockNode, targetId: string): TabContainerNode | null {
    if (root.id === targetId) return null

    if (root.type === "tabContainer") {
      if (root.panels.some((panel) => panel.id === targetId)) return root
    }

    if (root.type === "container") {
      return (
        this.getParentTabContainerInTree(root.first, targetId) ??
        this.getParentTabContainerInTree(root.second, targetId)
      )
    }

    return null
  }

  private updateNode(
    root: DockNode,
    nodeId: string,
    updateFn: (node: DockNode) => DockNode,
  ): DockNode | null {
    if (root.id === nodeId) return updateFn(root)

    if (root.type === "container") {
      return {
        ...root,
        first: this.updateNode(root.first, nodeId, updateFn) ?? root.first,
        second: this.updateNode(root.second, nodeId, updateFn) ?? root.second,
      }
    }

    if (root.type === "tabContainer") {
      if (root.id === nodeId) return updateFn(root)

      const updatedPanels = root.panels.map((panel) => {
        if (panel.id === nodeId) return updateFn(panel) as PanelNode
        return panel
      })

      return { ...root, panels: updatedPanels }
    }

    return root
  }

  private updateNodeSize(root: DockNode, nodeId: string, newSize: number): DockNode {
    if (!root) return root

    if (root.type === "container") {
      if (root.id === nodeId) return { ...root, size: newSize }
      return {
        ...root,
        first: this.updateNodeSize(root.first, nodeId, newSize),
        second: this.updateNodeSize(root.second, nodeId, newSize),
      }
    }

    if (root.type === "tabContainer") {
      return {
        ...root,
        panels: root.panels.map((p) => this.updateNodeSize(p, nodeId, newSize) as PanelNode),
      }
    }

    return root
  }

  private recalcActivePanels(
    root: DockNode,
    currentActive: { [key: string]: string } = {},
  ): { [key: string]: string } {
    const result: { [key: string]: string } = {}

    const traverse = (n: DockNode) => {
      if (n.type === "tabContainer") {
        if (n.activeId && n.panels.some((p) => p.id === n.activeId)) {
          result[n.id] = n.activeId
        } else {
          const current = currentActive[n.id]
          const panelIds = n.panels.map((p) => p.id)

          if (current && panelIds.includes(current)) {
            result[n.id] = current
          } else if (n.panels.length > 0) {
            result[n.id] = n.panels[0].id
          }
        }
        n.panels.forEach(traverse)
      } else if (n.type === "container") {
        traverse(n.first)
        traverse(n.second)
      }
    }

    traverse(root)
    return result
  }

  private createSplitWithTarget(
    root: DockNode,
    sourcePanel: PanelNode,
    target: DockNode,
    position: DockingPosition,
  ): DockNode {
    const isHorizontal = position === "left" || position === "right"
    const splitDirection = isHorizontal ? "horizontal" : "vertical"

    let firstChild: DockNode
    let secondChild: DockNode

    if (position === "top" || position === "left") {
      firstChild = sourcePanel
      secondChild = target
    } else {
      firstChild = target
      secondChild = sourcePanel
    }

    const container: ContainerNode = {
      id: createIdBySeed(`container-${Date.now().toString()}`),
      type: "container",
      splitDirection,
      first: firstChild,
      second: secondChild,
      size: 0.5,
    }

    return this.replaceNode(root, target.id, container)
  }

  private addToExistingTabGroup(
    root: DockNode,
    tabContainerId: string,
    sourcePanel: PanelNode,
  ): DockNode {
    const update = (n: DockNode): DockNode => {
      if (n.type === "tabContainer" && n.id === tabContainerId) {
        if (!n.panels.find((p) => p.id === sourcePanel.id)) {
          return { ...n, panels: [...n.panels, sourcePanel], activeId: sourcePanel.id }
        }
        return n
      }

      if (n.type === "container") {
        return { ...n, first: update(n.first), second: update(n.second) }
      }

      return n
    }

    return update(root)
  }

  private createTabGroup(root: DockNode, targetId: string, sourcePanel: PanelNode): DockNode {
    const parentTab = this.getParentTabContainerInTree(root, targetId)

    if (parentTab) {
      return this.addToExistingTabGroup(root, parentTab.id, sourcePanel)
    }

    const targetNode = this.findNodeById(root, targetId)
    if (!targetNode || targetNode.type !== "panel") return root

    const newTab: TabContainerNode = {
      id: createIdBySeed(`tab-${Date.now().toString()}`),
      type: "tabContainer",
      panels: [targetNode, sourcePanel],
      activeId: sourcePanel.id,
    }

    return this.replaceNode(root, targetId, newTab)
  }

  private reorderTabsInContainer(
    root: DockNode,
    tabContainerId: string,
    sourceTabId: string,
    targetTabId: string,
    position: DockingPosition,
  ): DockNode {
    const update = (n: DockNode): DockNode => {
      if (n.type === "tabContainer" && n.id === tabContainerId) {
        const panels = [...n.panels]
        const sourceIndex = panels.findIndex((p) => p.id === sourceTabId)

        if (sourceIndex === -1) return n

        const sourcePanel = panels[sourceIndex]

        if (position === "tab-into") {
          return { ...n, activeId: sourcePanel.id }
        }

        panels.splice(sourceIndex, 1)
        const targetIndex = panels.findIndex((p) => p.id === targetTabId)

        if (targetIndex === -1) {
          panels.push(sourcePanel)
          return { ...n, panels, activeId: sourcePanel.id }
        }

        let insertIndex = targetIndex
        if (position === "tab-after") insertIndex += 1

        panels.splice(insertIndex, 0, sourcePanel)
        return { ...n, panels, activeId: sourcePanel.id }
      }

      if (n.type === "container") {
        return { ...n, first: update(n.first), second: update(n.second) }
      }

      return n
    }

    return update(root)
  }

  private insertPanelIntoTabContainer(
    root: DockNode,
    tabContainerId: string,
    sourcePanel: PanelNode,
    targetTabId: string,
    position: DockingPosition,
  ): DockNode {
    const update = (n: DockNode): DockNode => {
      if (n.type === "tabContainer" && n.id === tabContainerId) {
        if (position === "tab-into") {
          if (!n.panels.find((p) => p.id === sourcePanel.id)) {
            return { ...n, panels: [...n.panels, sourcePanel], activeId: sourcePanel.id }
          }
          return { ...n, activeId: sourcePanel.id }
        }

        const panels = [...n.panels]
        const existingIndex = panels.findIndex((p) => p.id === sourcePanel.id)
        if (existingIndex !== -1) panels.splice(existingIndex, 1)

        const targetIndex = panels.findIndex((p) => p.id === targetTabId)
        if (targetIndex === -1) {
          panels.push(sourcePanel)
          return { ...n, panels, activeId: sourcePanel.id }
        }

        let insertIndex = targetIndex
        if (position === "tab-after") insertIndex += 1

        panels.splice(insertIndex, 0, sourcePanel)
        return { ...n, panels, activeId: sourcePanel.id }
      }

      if (n.type === "container") {
        return { ...n, first: update(n.first), second: update(n.second) }
      }

      return n
    }

    return update(root)
  }

  private insertPanelAtTarget(
    root: DockNode,
    targetId: string,
    sourcePanel: PanelNode,
    pos: DockingPosition,
  ): DockNode {
    const targetNode = this.findNodeById(root, targetId)
    if (!targetNode) return root

    if (pos === "tab-before" || pos === "tab-after" || pos === "tab-into") {
      const targetParentTab = this.getParentTabContainerInTree(root, targetId)

      if (targetParentTab) {
        return this.insertPanelIntoTabContainer(
          root,
          targetParentTab.id,
          sourcePanel,
          targetId,
          pos,
        )
      }
      if (targetNode.type === "tabContainer" && pos === "tab-into") {
        return this.addToExistingTabGroup(root, targetNode.id, sourcePanel)
      }
      if (targetNode.type === "panel" && pos === "tab-into") {
        return this.createTabGroup(root, targetId, sourcePanel)
      }
      return this.createSplitWithTarget(root, sourcePanel, targetNode, "top")
    }

    return this.createSplitWithTarget(root, sourcePanel, targetNode, pos)
  }

  private optimizeTreeStructure(node: DockNode): DockNode | null {
    if (!node) return null

    if (node.type === "container") {
      const optimizedFirst = this.optimizeTreeStructure(node.first)
      const optimizedSecond = this.optimizeTreeStructure(node.second)

      if (!optimizedFirst) return optimizedSecond
      if (!optimizedSecond) return optimizedFirst

      return { ...node, first: optimizedFirst, second: optimizedSecond }
    }

    if (node.type === "tabContainer") {
      const optimizedPanels = node.panels
        .map((p) => this.optimizeTreeStructure(p) as PanelNode | null)
        .filter((p): p is PanelNode => p !== null)

      if (optimizedPanels.length === 1) return optimizedPanels[0]
      if (optimizedPanels.length === 0) return null

      const activeId =
        node.activeId && optimizedPanels.some((p) => p.id === node.activeId)
          ? node.activeId
          : optimizedPanels[0].id

      return { ...node, panels: optimizedPanels, activeId }
    }

    return node
  }

  private rebalanceTree(node: DockNode): DockNode {
    if (!node) return node

    if (node.type === "container") {
      let left = this.rebalanceTree(node.first)
      let right = this.rebalanceTree(node.second)

      if (!left) return right
      if (!right) return left

      if (left.type === "container" && left.splitDirection === node.splitDirection) {
        left = {
          ...left,
          first: this.rebalanceTree(left.first),
          second: this.rebalanceTree(left.second),
        }
      }

      if (right.type === "container" && right.splitDirection === node.splitDirection) {
        right = {
          ...right,
          first: this.rebalanceTree(right.first),
          second: this.rebalanceTree(right.second),
        }
      }

      return { ...node, first: left, second: right }
    }

    if (node.type === "tabContainer") {
      const panels = node.panels
        .map((p) => {
          const rebalanced = this.rebalanceTree(p)
          return rebalanced.type === "panel" ? rebalanced : null
        })
        .filter((p): p is PanelNode => p !== null)

      if (panels.length === 0) return node
      if (panels.length === 1) return panels[0]

      const activeId =
        node.activeId && panels.some((p) => p.id === node.activeId) ? node.activeId : panels[0].id

      return { ...node, panels, activeId }
    }

    return node
  }
}
