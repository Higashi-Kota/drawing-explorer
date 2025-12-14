---
paths: packages/design-tokens/**/*
---

# Design Token Rules

## Required Skills

When modifying design tokens, invoke these skills:

1. **`ui-theme`** - Style Dictionary workflow, token format

## Token Workflow

1. Define tokens in JSON (`src/tokens/*.json`)
2. Run `pnpm build` to generate CSS output
3. Tokens available as CSS variables and Tailwind utilities

## Token Format

```json
{
  "color": {
    "semantic": {
      "primary": { "value": "{color.base.cyan.600}" }
    }
  }
}
```

## Categories

| Category | Prefix | File |
|----------|--------|------|
| Colors | `--color-*` | `colors/*.json` |
| Spacing | `--spacing-*` | `spacing/index.json` |
| Typography | `--font-*` | `typography/index.json` |
| Radius | `--radius-*` | `radius/index.json` |
| Shadow | `--shadow-*` | `shadow/index.json` |
