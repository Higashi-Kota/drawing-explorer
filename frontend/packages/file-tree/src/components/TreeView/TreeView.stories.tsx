import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { FileTreeManager } from "../../core/FileTreeManager"
import type { FolderNode } from "../../types"
import { TreeView } from "./index"

const createSampleTree = (): FolderNode => ({
  id: "root",
  name: "Project",
  path: "",
  depth: 0,
  type: "folder",
  children: [
    {
      id: "src",
      name: "src",
      path: "src",
      depth: 1,
      type: "folder",
      children: [
        {
          id: "components",
          name: "components",
          path: "src/components",
          depth: 2,
          type: "folder",
          children: [
            {
              id: "button",
              name: "Button.tsx",
              path: "src/components/Button.tsx",
              depth: 3,
              type: "file",
              data: { size: 1024, lastModified: Date.now(), mimeType: "text/typescript" },
            },
            {
              id: "input",
              name: "Input.tsx",
              path: "src/components/Input.tsx",
              depth: 3,
              type: "file",
              data: { size: 2048, lastModified: Date.now(), mimeType: "text/typescript" },
            },
          ],
        },
        {
          id: "main",
          name: "main.tsx",
          path: "src/main.tsx",
          depth: 2,
          type: "file",
          data: { size: 512, lastModified: Date.now(), mimeType: "text/typescript" },
        },
        {
          id: "app",
          name: "App.tsx",
          path: "src/App.tsx",
          depth: 2,
          type: "file",
          data: { size: 3072, lastModified: Date.now(), mimeType: "text/typescript" },
        },
      ],
    },
    {
      id: "public",
      name: "public",
      path: "public",
      depth: 1,
      type: "folder",
      children: [
        {
          id: "favicon",
          name: "favicon.ico",
          path: "public/favicon.ico",
          depth: 2,
          type: "file",
          data: { size: 4096, lastModified: Date.now(), mimeType: "image/x-icon" },
        },
      ],
    },
    {
      id: "readme",
      name: "README.md",
      path: "README.md",
      depth: 1,
      type: "file",
      data: { size: 1500, lastModified: Date.now(), mimeType: "text/markdown" },
    },
    {
      id: "package",
      name: "package.json",
      path: "package.json",
      depth: 1,
      type: "file",
      data: { size: 800, lastModified: Date.now(), mimeType: "application/json" },
    },
  ],
})

const TreeViewWrapper = () => {
  const [, setUpdateCount] = useState(0)
  const [tree] = useState(() => {
    const manager = new FileTreeManager(createSampleTree())
    manager.expand("")
    return manager
  })

  const handleTreeUpdate = () => {
    setUpdateCount((prev) => prev + 1)
  }

  return (
    <div className='w-64 h-96 overflow-auto bg-background border border-border rounded-lg'>
      <TreeView
        tree={tree}
        onTreeUpdate={handleTreeUpdate}
        onFolderSelect={(path) => console.log("Folder selected:", path)}
        onFileSelect={(path) => console.log("File selected:", path)}
        onSelectionChange={(paths) => console.log("Selection changed:", [...paths])}
      />
    </div>
  )
}

const meta: Meta<typeof TreeView> = {
  title: "Components/TreeView",
  component: TreeView,
  parameters: {
    layout: "padded",
  },
}

export default meta
type Story = StoryObj<typeof TreeView>

export const Default: Story = {
  render: () => <TreeViewWrapper />,
}

export const WithEditActions: Story = {
  render: () => {
    const TreeViewWithEdit = () => {
      const [, setUpdateCount] = useState(0)
      const [tree] = useState(() => {
        const manager = new FileTreeManager(createSampleTree())
        manager.expand("")
        manager.expand("src")
        return manager
      })

      const handleTreeUpdate = () => {
        setUpdateCount((prev) => prev + 1)
      }

      return (
        <div className='w-64 h-96 overflow-auto bg-background border border-border rounded-lg'>
          <TreeView
            tree={tree}
            onTreeUpdate={handleTreeUpdate}
            onFolderSelect={(path) => console.log("Folder selected:", path)}
            onFileSelect={(path) => console.log("File selected:", path)}
            onRename={(path, newName) => console.log("Rename:", path, "to", newName)}
            onCreate={(parentPath, name, type) =>
              console.log("Create:", type, name, "in", parentPath)
            }
            onDelete={(node) => console.log("Delete:", node.path)}
          />
        </div>
      )
    }
    return <TreeViewWithEdit />
  },
}

export const ExpandedTree: Story = {
  render: () => {
    const ExpandedTreeView = () => {
      const [, setUpdateCount] = useState(0)
      const [tree] = useState(() => {
        const manager = new FileTreeManager(createSampleTree())
        manager.expandAll()
        return manager
      })

      const handleTreeUpdate = () => {
        setUpdateCount((prev) => prev + 1)
      }

      return (
        <div className='w-64 h-125 overflow-auto bg-background border border-border rounded-lg'>
          <TreeView tree={tree} onTreeUpdate={handleTreeUpdate} />
        </div>
      )
    }
    return <ExpandedTreeView />
  },
}
