---
paths: packages/**/*.test.ts, packages/**/*.test.tsx, apps/**/*.test.ts, apps/**/*.test.tsx
---

# Unit Test Rules

## Required Skills

When writing tests, invoke these skills:

1. **`testing`** - Vitest + Storybook strategy, test placement
2. **`type-patterns`** - Result types for testable logic

## Test Placement

| Target | Location |
|--------|----------|
| Pure functions, utilities | Vitest (`*.test.ts`) |
| State management logic | Vitest (`*.test.ts`) |
| Component visual states | Storybook showcase stories |
| Component interactions | Storybook play functions |
| Cross-page user flows | Playwright E2E |

## Guidelines

- Test logic in Vitest, not UI rendering
- Use Storybook for UI state catalog and interaction tests
- Avoid testing implementation details
