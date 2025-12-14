import type React from "react"

interface PanelPreviewProps {
  title: string
}

export const PanelPreview: React.FC<PanelPreviewProps> = ({ title }) => {
  return (
    <div
      className='
        bg-card text-card-foreground
        border-2 border-primary
        rounded-md px-3 py-2
        shadow-2xl
        text-sm font-medium
        pointer-events-none
        z-[var(--z-index-drag-preview)]
      '
    >
      {title}
    </div>
  )
}
