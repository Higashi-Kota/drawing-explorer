---
name: testing
description: |
  Vitest + Storybook testing strategy with clear role separation.
  Reference for implementing unit tests and UI interaction tests.
---

# Testing Skill

## Role Separation

| Tool | Responsibility | Target |
|------|----------------|--------|
| **Vitest** | Logic & Unit Tests | Classes, utilities, calculations |
| **Storybook** | UI Catalog + Interaction Tests | Component visual state changes |

## Key Principles

### Storybook Story Selection Criteria

**Include**: Cases where component state changes visually
- Default / Empty / Loading / Error / Disabled
- Selected / Hover / Focus states
- Form input / Validation error display

**Exclude**: Stories only for coverage
- Stories for internal logic branches
- Exhaustive props combinations → Use argTypes controls
- Cases that look visually identical

### Use argTypes for Props Combinations

Control props dynamically via the controls panel instead of creating more stories.

```typescript
const meta = {
  component: TreeView,
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "compact", "comfortable"],
    },
    disabled: { control: "boolean" },
    size: { control: { type: "range", min: 12, max: 24, step: 2 } },
  },
} satisfies Meta<typeof TreeView>
```

### Active Use of Play Functions

Implement interaction tests with play functions, especially for form handling.

```typescript
// Form submission test
export const FormSubmission: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const user = userEvent.setup()

    await user.type(canvas.getByLabelText("Filename"), "test.txt")
    await user.click(canvas.getByRole("button", { name: "Create" }))

    await expect(canvas.getByText("Created successfully")).toBeInTheDocument()
  },
}

// Keyboard navigation test
export const KeyboardNavigation: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const user = userEvent.setup()

    canvas.getByRole("treeitem").focus()
    await user.keyboard("{ArrowDown}")
    await user.keyboard("{Enter}")
  },
}
```

### A11y Testing (@storybook/addon-a11y)

**Setup**:

```typescript
// .storybook/main.ts
export default {
  addons: ["@storybook/addon-a11y"],
}

// .storybook/preview.ts
export default {
  parameters: {
    a11y: {
      config: {
        rules: [
          { id: "color-contrast", enabled: true },
          { id: "label", enabled: true },
        ],
      },
    },
  },
}
```

**Per-story configuration**: Disable rules for intentional violations.

```typescript
export const DecorativeIcon: Story = {
  parameters: {
    a11y: {
      config: {
        rules: [{ id: "image-alt", enabled: false }], // Decorative icons don't need alt
      },
    },
  },
}
```

**test-runner for CI automation**:

```typescript
// .storybook/test-runner.ts
import { checkA11y, injectAxe } from "axe-playwright"

export default {
  async preVisit(page) {
    await injectAxe(page)
  },
  async postVisit(page) {
    await checkA11y(page, "#storybook-root", {
      detailedReport: true,
      detailedReportOptions: { html: true },
    })
  },
}
```

```bash
pnpm test-storybook  # Run a11y checks on all stories
```

**Verify ARIA state in play functions**:

```typescript
export const ExpandItem: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const item = canvas.getByRole("treeitem", { name: /Documents/i })

    await expect(item).toHaveAttribute("aria-expanded", "false")
    await userEvent.click(item)
    await expect(item).toHaveAttribute("aria-expanded", "true")
  },
}
```

**Keyboard navigation verification**:

```typescript
export const KeyboardNavigation: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const item = canvas.getByRole("treeitem", { name: /item/i })

    item.focus()
    await expect(item).toHaveFocus()

    await userEvent.keyboard("{Delete}")
    await expect(canvas.getByRole("alertdialog")).toBeInTheDocument()
  },
}
```

### Vitest for Logic Tests

Test UI-independent logic directly with Vitest.

```typescript
// core/Manager.test.ts
describe("Manager", () => {
  it("finds node by path", () => {
    const manager = new Manager()
    const node = manager.findByPath("/root/docs")
    expect(node?.name).toBe("docs")
  })

  it("sorts child nodes", () => {
    const sorted = sortNodes(nodes)
    expect(sorted[0].type).toBe("folder") // Folders first
  })
})
```

## File Structure

```
src/
├── core/
│   ├── Manager.ts
│   └── Manager.test.ts          # Logic tests
└── components/Component/
    ├── Component.tsx
    ├── Component.stories.tsx    # State catalog + play functions
    └── mocks.ts                 # Shared mock data
```

## Vitest Browser Mode (Component Testing)

For components that require real DOM/browser APIs:

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      provider: "playwright",
      name: "chromium",
    },
  },
})
```

```typescript
// Component.browser.test.tsx
import { render } from "vitest-browser-react"
import { page } from "@vitest/browser/context"

test("renders and responds to interaction", async () => {
  const { getByRole } = render(<Button>Click me</Button>)

  const button = getByRole("button")
  await button.click()

  await expect.element(button).toHaveTextContent("Clicked!")
})
```

### When to Use Browser Mode vs JSDOM

| Scenario | Use |
|----------|-----|
| Unit tests for logic/utilities | Vitest (JSDOM) |
| Component rendering/snapshots | Vitest (JSDOM) |
| Tests requiring real browser APIs | Vitest Browser Mode |
| Complex interactions, focus, scroll | Vitest Browser Mode |
| Visual state catalog | Storybook |
| Full user flows across pages | Playwright E2E |

## Test Organization Decision Matrix

| What to Test | Where |
|--------------|-------|
| Pure functions, utilities | `*.test.ts` (Vitest) |
| State management logic | `*.test.ts` (Vitest) |
| Component props/variants | Storybook showcase stories |
| Component interactions | Storybook play functions |
| A11y compliance | Storybook + addon-a11y |
| Real browser behavior | `*.browser.test.tsx` (Vitest Browser) |
| Cross-page user journeys | `e2e/*.spec.ts` (Playwright) |

## Commands

```bash
pnpm test              # Vitest watch mode
pnpm test:coverage     # Coverage report
pnpm test:browser      # Vitest browser mode
pnpm storybook         # Storybook dev server
```

## References

- [Vitest Documentation](https://vitest.dev/)
- [Vitest Browser Mode](https://vitest.dev/guide/browser/)
- [Storybook Testing](https://storybook.js.org/docs/writing-tests)
