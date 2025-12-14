import type React from "react"
import { useEffect, useRef, useState } from "react"

interface InlineInputProps {
  initialValue: string
  onSubmit: (value: string) => void
  onCancel: () => void
  placeholder?: string
}

export const InlineInput: React.FC<InlineInputProps> = ({
  initialValue,
  onSubmit,
  onCancel,
  placeholder,
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      if (value.trim()) {
        onSubmit(value.trim())
      }
    } else if (e.key === "Escape") {
      e.preventDefault()
      onCancel()
    }
  }

  const handleBlur = () => {
    onCancel()
  }

  return (
    <input
      ref={inputRef}
      type='text'
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      placeholder={placeholder}
      aria-label='Inline name editor'
      className='flex-1 min-w-0 h-5 px-1.5 text-sm bg-background border border-ring rounded outline-none focus:ring-1 focus:ring-ring'
      onClick={(e) => e.stopPropagation()}
    />
  )
}
