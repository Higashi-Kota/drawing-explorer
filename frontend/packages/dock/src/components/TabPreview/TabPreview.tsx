import type React from "react"

interface TabPreviewProps {
  title: string
}

export const TabPreview: React.FC<TabPreviewProps> = ({ title }) => {
  return (
    <span className='text-sm bg-card border border-border px-3 py-1.5 rounded-t-md shadow-md'>
      {title}
    </span>
  )
}
