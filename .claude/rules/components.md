---
paths: packages/**/*.tsx, apps/**/*.tsx
---

# React Component Rules

## Required Skills

When working with React components, invoke these skills:

1. **`ui-component`** - Component API design, ARIA patterns, semantic HTML
2. **`styling`** - CSS Grid layout, design tokens, data attributes
3. **`a11y`** - WCAG 2.2 AA compliance verification
4. **`senior-ui-designer`** - UX design guidance, interaction states, OKLCH colors, cursor patterns

## Component Checklist

- Accept `ref` as a prop (React 19 pattern, not forwardRef)
- Use design tokens (no hardcoded colors/spacing)
- Use CSS Grid over Flexbox
- Use `gap` instead of margin utilities
- Use `data-*` attributes for state-based styling
- Follow W3C APG patterns for interactive components
- Ensure focus visible (2px+ ring)
- Ensure touch targets (24x24 min)
- Padding >= border-radius (prevent text clipping at corners)
- Use `disabled:cursor-not-allowed` (not `disabled:pointer-events-none`)
