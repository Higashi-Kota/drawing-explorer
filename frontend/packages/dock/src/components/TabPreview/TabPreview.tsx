import type React from "react"

interface TabPreviewProps {
  title: string
}

export const TabPreview: React.FC<TabPreviewProps> = ({ title }) => {
  return (
    <span
      className='
        text-sm font-medium
        bg-card text-card-foreground
        border-2 border-primary
        px-3 py-1.5
        rounded-t-md shadow-2xl
        pointer-events-none
        z-[var(--z-index-drag-preview)]
      '
    >
      {title}
    </span>
  )
}
