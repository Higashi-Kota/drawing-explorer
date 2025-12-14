import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "./App"
import { initializeTheme } from "./components/ThemeSelector"
import "./index.css"

// Initialize theme before React renders to prevent flash
initializeTheme()

const rootElement = document.getElementById("root")
if (!rootElement) throw new Error("Failed to find root element")

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
