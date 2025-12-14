---
paths: apps/**/e2e/**/*.ts, apps/**/e2e/**/*.spec.ts
---

# E2E Test Rules

## Required Skills

When writing E2E tests, invoke these skills:

1. **`e2e`** - Playwright patterns, Page Object Model
2. **`testing`** - Test pyramid, avoid duplication with unit tests

## E2E Test Selection

**Include in E2E:**
- Critical business flows (auth, checkout)
- Multi-page navigation
- Flows requiring server state

**Exclude from E2E (use component tests):**
- Individual component variants
- Form validation rules
- UI state toggling

## Patterns

- Use Page Object Model for reusable page interactions
- Query by role (`getByRole`) for a11y-friendly selectors
- Include axe-core a11y checks
