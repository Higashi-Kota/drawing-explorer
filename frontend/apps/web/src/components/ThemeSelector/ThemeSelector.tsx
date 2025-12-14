import { Palette } from "lucide-react"
import type React from "react"
import { useEffect, useState } from "react"

export type ThemeId = "default" | "warm" | "kumiko" | "nouveau"

export interface ThemeOption {
  id: ThemeId
  label: string
  description: string
  swatches: string[]
}

const themes: ThemeOption[] = [
  {
    id: "default",
    label: "Default",
    description: "Professional indigo",
    swatches: [
      "oklch(52% 0.18 275)", // indigo-600
      "oklch(94% 0.02 275)", // indigo-200
      "oklch(98.5% 0.002 260)", // slate-50
      "oklch(50% 0.01 260)", // slate-500
    ],
  },
  {
    id: "warm",
    label: "Warm",
    description: "Sunset terracotta & amber",
    swatches: [
      "oklch(60% 0.140 35)", // terracotta-500
      "oklch(72% 0.165 70)", // amber-500
      "oklch(99% 0.008 55)", // cream-50
      "oklch(50% 0.150 25)", // rust-500
    ],
  },
  {
    id: "kumiko",
    label: "Kumiko",
    description: "Japanese wooden lattice",
    swatches: [
      "oklch(75% 0.078 70)", // hinoki-500
      "oklch(50% 0.125 25)", // urushi-500
      "oklch(60% 0.078 110)", // tatami-500
      "oklch(70% 0.052 50)", // kiri-500
    ],
  },
  {
    id: "nouveau",
    label: "Art Nouveau",
    description: "Organic elegance",
    swatches: [
      "oklch(52% 0.105 145)", // moss-500
      "oklch(65% 0.155 75)", // gold-500
      "oklch(45% 0.160 15)", // burgundy-500
      "oklch(48% 0.072 55)", // bronze-500
    ],
  },
]

const THEME_STORAGE_KEY = "drawing-explorer-theme"

const validThemeIds: ThemeId[] = ["default", "warm", "kumiko", "nouveau"]

export const DEFAULT_THEME: ThemeId = "default"

export function resolveThemeId(value: string | undefined): ThemeId {
  if (value && validThemeIds.includes(value as ThemeId)) {
    return value as ThemeId
  }
  return DEFAULT_THEME
}

function getStoredTheme(): ThemeId {
  if (typeof window === "undefined") return DEFAULT_THEME
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  return resolveThemeId(stored ?? undefined)
}

export interface ApplyThemeOptions {
  persist?: boolean
}

export function applyTheme(themeId: ThemeId, options: ApplyThemeOptions = {}) {
  const { persist = true } = options
  const root = document.documentElement

  // Remove all theme classes
  for (const id of validThemeIds) {
    if (id !== "default") root.classList.remove(`theme-${id}`)
  }

  if (themeId === "default") {
    delete root.dataset.theme
  } else {
    root.dataset.theme = themeId
    root.classList.add(`theme-${themeId}`)
  }

  if (persist) {
    window.localStorage.setItem(THEME_STORAGE_KEY, themeId)
  }
}

export interface ThemeSelectorProps {
  onChange?: (themeId: ThemeId) => void
  compact?: boolean
  className?: string
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  onChange,
  compact = false,
  className = "",
}) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeId>("default")

  useEffect(() => {
    const stored = getStoredTheme()
    setCurrentTheme(stored)
    applyTheme(stored)
  }, [])

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY && e.newValue) {
        const newTheme = resolveThemeId(e.newValue)
        setCurrentTheme(newTheme)
        applyTheme(newTheme)
      }
    }
    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [])

  const handleChange = (themeId: ThemeId) => {
    setCurrentTheme(themeId)
    applyTheme(themeId)
    onChange?.(themeId)
  }

  const currentThemeData = themes.find((t) => t.id === currentTheme)

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Palette className='w-4 h-4 text-muted-foreground' />
      <select
        id='theme-selector'
        name='theme'
        value={currentTheme}
        onChange={(e) => handleChange(e.target.value as ThemeId)}
        className='text-sm bg-transparent border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring'
      >
        {themes.map((theme) => (
          <option key={theme.id} value={theme.id}>
            {theme.label}
          </option>
        ))}
      </select>
      {!compact && currentThemeData && (
        <div
          className='flex gap-0.5'
          role='img'
          aria-label={`${currentThemeData.label} color swatches`}
        >
          {currentThemeData.swatches.map((color, index) => (
            <span
              key={index}
              className='w-4 h-4 rounded-sm border border-border-subtle'
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function initializeTheme() {
  if (typeof window === "undefined") return
  const stored = getStoredTheme()
  applyTheme(stored)
}
