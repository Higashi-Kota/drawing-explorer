import { Palette } from "lucide-react"
import type React from "react"
import { ThemeSelector } from "../ThemeSelector"

export const Header: React.FC = () => {
  return (
    <header className='h-12 flex items-center justify-between px-4 border-b border-border bg-card'>
      <div className='flex items-center gap-2'>
        <Palette className='w-5 h-5 text-primary' />
        <h1 className='text-lg font-semibold text-foreground'>Drawing Explorer</h1>
      </div>

      <div className='flex items-center gap-2'>
        <ThemeSelector />
      </div>
    </header>
  )
}
