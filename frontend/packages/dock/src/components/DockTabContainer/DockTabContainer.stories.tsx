import type { Meta, StoryObj } from "@storybook/react-vite"
import type React from "react"
import { DockingManager } from "../../core/DockingManager"
import type { PanelContent, PanelNode, TabContainerNode } from "../../types"
import { DockingContext } from "../DockingProvider"
import { DockTabContainer } from "./index"

const createTestPanel = (id: string, title: string): PanelNode => ({
  id,
  type: "panel",
  title,
  content: `Content for ${title}`,
  contentKey: "default",
})

const testContents: PanelContent[] = [
  { key: "default", label: "Default", content: <div>Default Content</div> },
  { key: "editor", label: "Editor", content: <div>Editor Content</div> },
]

const DockingContextWrapper = ({
  children,
  panels,
}: {
  children: React.ReactNode
  panels: PanelNode[]
}) => {
  const tabContainer: TabContainerNode = {
    id: "tab-container-1",
    type: "tabContainer",
    panels,
    activeId: panels[0]?.id,
  }
  const manager = new DockingManager(tabContainer)

  return (
    <DockingContext.Provider
      value={{
        manager,
        onRemove: () => {},
        onEdit: () => {},
        onMove: () => {},
        onResize: () => {},
        onActivatePanel: () => {},
        onAddTab: () => {},
        onUpdateContentKey: () => {},
        availableContents: testContents,
        onMaximizePanel: () => {},
        onRestorePanel: () => {},
        isMaximized: () => false,
        isAnyPanelMaximized: () => false,
      }}
    >
      {children}
    </DockingContext.Provider>
  )
}

const meta: Meta<typeof DockTabContainer> = {
  title: "Components/DockTabContainer",
  component: DockTabContainer,
  parameters: {
    layout: "padded",
  },
  decorators: [
    (Story, context) => {
      const panels = (context.args.node as TabContainerNode)?.panels ?? [
        createTestPanel("tab-1", "Tab 1"),
        createTestPanel("tab-2", "Tab 2"),
      ]
      return (
        <DockingContextWrapper panels={panels}>
          <div style={{ width: 500, height: 300 }}>
            <Story />
          </div>
        </DockingContextWrapper>
      )
    },
  ],
  argTypes: {
    node: { control: false },
    instanceId: { control: false },
  },
}

export default meta
type Story = StoryObj<typeof DockTabContainer>

export const TwoTabs: Story = {
  args: {
    node: {
      id: "tab-container-1",
      type: "tabContainer",
      panels: [createTestPanel("tab-1", "Tab 1"), createTestPanel("tab-2", "Tab 2")],
      activeId: "tab-1",
    },
    instanceId: Symbol("test"),
  },
}

export const MultipleTabs: Story = {
  args: {
    node: {
      id: "tab-container-2",
      type: "tabContainer",
      panels: [
        createTestPanel("tab-1", "Explorer"),
        createTestPanel("tab-2", "Search"),
        createTestPanel("tab-3", "Git"),
        createTestPanel("tab-4", "Debug"),
      ],
      activeId: "tab-1",
    },
    instanceId: Symbol("test"),
  },
}

export const SingleTab: Story = {
  args: {
    node: {
      id: "tab-container-3",
      type: "tabContainer",
      panels: [createTestPanel("tab-1", "Only Tab")],
      activeId: "tab-1",
    },
    instanceId: Symbol("test"),
  },
}
