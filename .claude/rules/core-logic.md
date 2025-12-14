---
paths: packages/**/core/**/*.ts, packages/**/utils/**/*.ts
---

# Core Logic Rules

## Required Skills

When implementing business logic, invoke these skills:

1. **`type-patterns`** - Result types, discriminated unions, exhaustive matching

## Type Safety Rules

| Avoid | Use Instead |
|-------|-------------|
| `any` | Proper type definitions |
| `as` assertions | Discriminated unions |
| `throw` exceptions | Result type |
| Type guards | `ts-pattern` `.exhaustive()` |

## Patterns

```typescript
// Result type for error handling
type Result<T, E> =
  | { readonly type: "success"; readonly data: T }
  | { readonly type: "error"; readonly error: E }

// Exhaustive matching with ts-pattern
match(result)
  .with({ type: "success" }, ({ data }) => handleSuccess(data))
  .with({ type: "error" }, ({ error }) => handleError(error))
  .exhaustive()
```

## Immutability

- Use `readonly` for all properties
- Use `ReadonlyArray`, `ReadonlyMap`, `ReadonlySet`
- Return new instances instead of mutating
