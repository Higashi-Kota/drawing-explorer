import type { Meta, StoryObj } from "@storybook/react-vite"
import type React from "react"
import { DockingManager } from "../../core/DockingManager"
import type { PanelContent, PanelNode } from "../../types"
import { DockingContext } from "../DockingProvider"
import { DockPanel } from "./index"

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
  panel,
}: {
  children: React.ReactNode
  panel: PanelNode
}) => {
  const manager = new DockingManager(panel)

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

const meta: Meta<typeof DockPanel> = {
  title: "Components/DockPanel",
  component: DockPanel,
  parameters: {
    layout: "padded",
  },
  decorators: [
    (Story) => {
      const panel = createTestPanel("test-panel", "Test Panel")
      return (
        <DockingContextWrapper panel={panel}>
          <div style={{ width: 400, height: 300 }}>
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
type Story = StoryObj<typeof DockPanel>

export const Default: Story = {
  args: {
    node: createTestPanel("panel-1", "Panel 1"),
    instanceId: Symbol("test"),
  },
}

export const WithLongTitle: Story = {
  args: {
    node: createTestPanel("panel-long", "This is a very long panel title that should truncate"),
    instanceId: Symbol("test"),
  },
}

export const WithContent: Story = {
  args: {
    node: {
      ...createTestPanel("panel-content", "Content Panel"),
      content: (
        <div className='p-4'>
          <h2 className='text-lg font-bold mb-2'>Panel Content</h2>
          <p className='text-muted-foreground'>
            This panel contains custom content that demonstrates the panel&apos;s ability to render
            complex layouts.
          </p>
        </div>
      ),
    },
    instanceId: Symbol("test"),
  },
}
