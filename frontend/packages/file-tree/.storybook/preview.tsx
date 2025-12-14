import type { Decorator, Preview } from "@storybook/react-vite"
import { useEffect } from "react"
import "./storybook.css"

type ThemeId = "default" | "dark"

const applyTheme = (themeId: ThemeId) => {
  document.documentElement.setAttribute("data-theme", themeId)
}

const withTheme: Decorator = (Story, context) => {
  const themeId = (context.globals.theme as ThemeId) ?? "default"

  useEffect(() => {
    applyTheme(themeId)
  }, [themeId])

  return (
    <div className='min-h-50 bg-background text-foreground font-sans p-4 transition-colors duration-300'>
      <Story />
    </div>
  )
}

const preview: Preview = {
  decorators: [withTheme],
  globalTypes: {
    theme: {
      name: "Theme",
      description: "Switch between color themes",
      defaultValue: "default",
      toolbar: {
        title: "Theme",
        icon: "paintbrush",
        items: [
          { value: "default", title: "Light", icon: "sun" },
          { value: "dark", title: "Dark", icon: "moon" },
        ],
        showName: true,
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: "default" as ThemeId,
  },
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      config: {
        rules: [
          { id: "color-contrast", enabled: true },
          { id: "aria-required-attr", enabled: true },
          { id: "button-name", enabled: true },
          { id: "label", enabled: true },
        ],
      },
    },
  },
}

export default preview
