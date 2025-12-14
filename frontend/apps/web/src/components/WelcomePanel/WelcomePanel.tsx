import { FileImage, FolderOpen, Palette } from "lucide-react"
import type React from "react"

export const WelcomePanel: React.FC = () => {
  return (
    <div className='h-full p-6 bg-muted/30 overflow-auto'>
      <div className='grid gap-4'>
        <div className='grid grid-cols-[auto_1fr] gap-3 items-center'>
          <div className='w-10 h-10 rounded-lg bg-primary/10 grid place-items-center'>
            <Palette className='w-5 h-5 text-primary' />
          </div>
          <div>
            <h2 className='text-base font-semibold text-foreground'>Drawing Explorer</h2>
            <p className='text-xs text-muted-foreground'>Create and organize your drawings</p>
          </div>
        </div>

        <div className='grid gap-2 pt-2'>
          <div className='grid grid-cols-[auto_1fr] gap-2 items-center text-sm text-muted-foreground'>
            <FolderOpen className='w-4 h-4 text-folder' />
            <span>Browse files in the explorer sidebar</span>
          </div>
          <div className='grid grid-cols-[auto_1fr] gap-2 items-center text-sm text-muted-foreground'>
            <FileImage className='w-4 h-4 text-primary' />
            <span>Double-click to open in a new panel</span>
          </div>
        </div>
      </div>
    </div>
  )
}
