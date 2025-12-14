import type React from "react"

interface PanelPreviewProps {
  title: string
}

export const PanelPreview: React.FC<PanelPreviewProps> = ({ title }) => {
  return (
    <div className='bg-card border border-border rounded-md px-3 py-2 shadow-lg text-sm font-medium'>
      {title}
    </div>
  )
}
