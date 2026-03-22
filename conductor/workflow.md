# Workflow — Forja

## TDD Policy

**Strict** — Tests are required before implementation.

- Write failing tests first, then implement to make them pass
- Every task must have corresponding test coverage
- No implementation code without a preceding test

## Commit Strategy

**Conventional Commits** with descriptive scopes.

### Branch Strategy

- Create a branch per conductor track: `track/<track-name>` (e.g., `track/rest-timer`)
- Commit freely to the track branch during development
- When the track is completed and working, merge into `main` to trigger the preview build

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

## CI/CD — EAS Workflows

Workflows are defined in `.eas/workflows/` and run automatically on Expo's cloud infrastructure.

| Trigger | Workflow | Action |
| --- | --- | --- |
| Push to `main` | `build-preview.yml` | Builds Android APK (internal distribution) |
| Tag `v*` | `release-production.yml` | Builds Android production binary |

### Releasing a new version

```
git tag v1.0.0
git push --tags
```

Lint and tests run locally via lefthook pre-commit hooks — no need to duplicate them in CI.

## Language Rules

- **Conductor files**: English
- **Code & comments**: English
