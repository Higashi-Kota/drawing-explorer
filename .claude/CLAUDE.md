# Drawing Explorer

A drawing application with file explorer and docking panel interface.

## Project Structure

```
drawing-explorer/
├── frontend/
│   ├── apps/
│   │   └── web/           # Main web application (Vite + React)
│   └── packages/
│       ├── design-tokens/ # OKLCH color tokens (Style Dictionary)
│       ├── dock/          # Docking panel system
│       ├── file-tree/     # File explorer tree view
│       ├── theme/         # Theme CSS (CSS-only package)
│       └── shared-config/ # Shared Biome and TypeScript configs
└── backend/               # Express server skeleton
```

## Tech Stack

### Frontend
- **React 19** with TypeScript
- **Vite 7** for build tooling
- **Tailwind CSS v4** with @tailwindcss/vite plugin
- **ts-pattern** for discriminated union matching
- **lucide-react** for icons

### Backend
- **Express** with TypeScript
- **tsx** for development

### Tooling
- **pnpm** workspaces for monorepo
- **Biome 2.3.8** for linting and formatting (no ESLint/Prettier)
- **Style Dictionary** for design token generation
- **taze** for dependency checking

## Development

```bash
# Install dependencies
pnpm install

# Build design tokens (required before first run)
pnpm --filter @internal/design-tokens build

# Run frontend dev server (port 5000)
pnpm dev

# Run backend dev server
pnpm dev:backend

# Type check all packages
pnpm typecheck

# Lint/format
pnpm lint
pnpm format

# Check for dependency updates
pnpm package:check
```

## Package Names

All packages use `@internal/` scope:
- `@internal/web` - Main web application
- `@internal/dock` - Docking panel system
- `@internal/file-tree` - File explorer
- `@internal/theme` - Theme CSS
- `@internal/design-tokens` - Design tokens
- `@internal/shared-config` - Shared configs
- `@internal/backend` - Backend server

## Key Design Decisions

1. **OKLCH Color Space**: All colors use OKLCH for perceptual uniformity
2. **Grid-first Layout**: CSS Grid for complex layouts (docking system)
3. **Event-driven State**: nanoevents for docking manager state changes
4. **Mutable Tree Manager**: FileTreeManager uses mutable internal state with React re-render callbacks
5. **Immutable Drag-Drop**: DragDropManager uses immutable state pattern
6. **CSS-only Theme Package**: Theme is pure CSS with no TypeScript runtime

## Packages

### @internal/design-tokens
Generates CSS variables using Style Dictionary with OKLCH colors.

### @internal/theme
CSS-only theme package with:
- Base styles and CSS custom properties
- Theme switching via data-theme attribute
- Tailwind v4 @theme block integration

### @internal/dock
Docking panel system with:
- Drag and drop panel rearrangement
- Tab containers
- Resizable splits
- Maximize/restore panels

### @internal/file-tree
File explorer with:
- Tree view with expand/collapse
- Multi-select support
- Keyboard navigation
- Drag and drop reordering
- Context menu
