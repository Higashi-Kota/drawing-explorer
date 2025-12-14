---
paths: packages/**/*.css, apps/**/*.css
---

# CSS Rules

## Required Skills

When working with CSS files, invoke these skills:

1. **`styling`** - Grid patterns, design tokens, modern CSS features
2. **`ui-theme`** - Style Dictionary token system
3. **`senior-ui-designer`** - Interaction states, hover/active patterns, OKLCH color theory

## Styling Checklist

- All values must reference CSS variables (no hardcoded px/rem/colors)
- Use semantic color tokens (`--color-primary`), not primitives (`--color-cyan-600`)
- Use Grid for layout, Flexbox only for single-axis alignment
- Use `gap` for spacing between elements
- Use `&[data-*]` selectors for state-based styles
- Respect `prefers-reduced-motion`
