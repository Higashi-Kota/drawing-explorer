import type React from "react"
import { useContext } from "react"
import { match } from "ts-pattern"
import type { DockNode } from "../../types"
import { Divider } from "../Divider"
import { DockingContext } from "../DockingProvider"
import { DockPanel } from "../DockPanel"
import { DockTabContainer } from "../DockTabContainer"

interface NodeRendererProps {
  node: DockNode
  instanceId: symbol
}

export const NodeRenderer: React.FC<NodeRendererProps> = ({ node, instanceId }) => {
  const dockingContext = useContext(DockingContext)

  if (dockingContext == null) {
    throw new Error("NodeRenderer must be used within a DockingContext")
  }

  const { onResize } = dockingContext

  if (node == null) return null

  return match(node)
    .with({ type: "panel" }, (panelNode) => (
      <div className='relative w-full h-full'>
        <DockPanel node={panelNode} instanceId={instanceId} />
      </div>
    ))
    .with({ type: "tabContainer" }, (tabNode) => (
      <DockTabContainer node={tabNode} instanceId={instanceId} />
    ))
    .with({ type: "container" }, (container) => {
      const isHorizontal = container.splitDirection === "horizontal"
      const firstSize = `${container.size * 100}%`
      const secondSize = `${(1 - container.size) * 100}%`

      return (
        <div
          className='dock-container grid w-full h-full'
          data-direction={container.splitDirection}
          style={{
            gridTemplateColumns: isHorizontal ? `${firstSize} auto ${secondSize}` : "1fr",
            gridTemplateRows: isHorizontal ? "1fr" : `${firstSize} auto ${secondSize}`,
          }}
        >
          <div
            className='dock-container-pane overflow-hidden'
            data-direction={container.splitDirection}
          >
            <NodeRenderer node={container.first} instanceId={instanceId} />
          </div>

          <Divider
            direction={container.splitDirection}
            nodeId={container.id}
            size={container.size}
            onResize={onResize}
          />

          <div
            className='dock-container-pane overflow-hidden'
            data-direction={container.splitDirection}
          >
            <NodeRenderer node={container.second} instanceId={instanceId} />
          </div>
        </div>
      )
    })
    .otherwise(() => null)
}
