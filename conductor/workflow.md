# Workflow — Forja

## TDD Policy

**Strict** — Tests are required before implementation.

- Write failing tests first, then implement to make them pass
- Every task must have corresponding test coverage
- No implementation code without a preceding test

## Commit Strategy

**Conventional Commits** with descriptive scopes. Push directly to `main`.

```
feat(workout): add rest timer with SVG arc animation
fix(home): correct next workout chip logic
test(store): add workoutStore persistence tests
refactor(navigation): simplify exercise flow routing
```

### Commit Types

| Type       | Usage                                    |
| ---------- | ---------------------------------------- |
| `feat`     | New feature                              |
| `fix`      | Bug fix                                  |
| `test`     | Adding or updating tests                 |
| `refactor` | Code change without feature/fix          |
| `docs`     | Documentation changes                    |
| `chore`    | Build, config, tooling                   |
| `style`    | Formatting, whitespace (no logic change) |

## Language Rules

- **Conductor files**: English
- **Code & comments**: English
