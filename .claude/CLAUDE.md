# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Drawing Explorer is a drawing application with file explorer and docking panel interface. Users can create and edit drawings stored in the browser's Origin Private File System (OPFS).

## Commands

```bash
pnpm install                                  # Install dependencies
pnpm --filter @internal/design-tokens build   # Build design tokens (required before first run)
pnpm dev:frontend                             # Run frontend dev server (port 5000)
pnpm dev:backend                              # Run backend dev server
pnpm typecheck                                # Type check all packages
pnpm lint                                     # Lint with Biome
pnpm lint:fix                                 # Lint and fix with Biome
pnpm format                                   # Format with Biome
pnpm storybook:dock                           # Run dock package Storybook
pnpm storybook:file-tree                      # Run file-tree package Storybook
```

## Architecture

### Monorepo Structure

- `frontend/apps/web/` - Main Vite + React application
- `frontend/packages/dock/` - Docking panel system
- `frontend/packages/file-tree/` - File explorer tree view
- `frontend/packages/drawing/` - Drawing canvas component
- `frontend/packages/theme/` - CSS-only theme (no TypeScript)
- `frontend/packages/design-tokens/` - OKLCH color tokens via Style Dictionary

All packages use `@internal/` scope.

### Docking System (`@internal/dock`)

Tree-based layout using discriminated union types:
- `PanelNode` - Individual panel with content
- `ContainerNode` - Binary split (horizontal/vertical) with `first`/`second` children
- `TabContainerNode` - Tab group containing multiple panels

`DockingManager` (mutable class) manages state and emits events via `nanoevents`. React components subscribe via `DockingProvider` context.

### File Tree (`@internal/file-tree`)

`FileTreeManager` (mutable class) manages tree structure with O(1) access via path indices. Maintains selection, expansion, and focus state internally. Uses `ts-pattern` for exhaustive discriminated union matching.

`DragDropManager` uses immutable state pattern for drag-drop operations.

### OPFS Integration

Files stored in browser's Origin Private File System. Drawing files use `.draw` extension with JSON format containing strokes array.

## Key Patterns

- **Discriminated unions** with `ts-pattern` for type-safe matching
- **Mutable manager classes** with event-driven React integration (not Redux/Zustand)
- **CSS Grid** for dock layout, **OKLCH** color space for design tokens
- **Biome** for linting/formatting (no ESLint/Prettier)
