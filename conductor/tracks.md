# Tracks Registry

| Status | Track ID | Title | Depends On | Created |
| ------ | -------- | ----- | ---------- | ------- |
| pending | `project-foundation_20260321` | Project Foundation | — | 2026-03-21 |
| pending | `zustand-stores_20260321` | Zustand Stores | project-foundation | 2026-03-21 |
| pending | `home-history-screens_20260321` | Home & History Screens | zustand-stores | 2026-03-21 |
| pending | `workout-flow-screens_20260321` | Workout Flow Screens | zustand-stores | 2026-03-21 |
| pending | `polish-accessibility_20260321` | Polish & Accessibility | home-history, workout-flow | 2026-03-21 |
| pending | `e2e-deploy_20260321` | E2E Tests & Deployment | polish-accessibility | 2026-03-21 |
| pending | `plan-store-foundation_20260322` | Plan Store Foundation | — | 2026-03-22 |
| pending | `plan-config-screens_20260322` | Plan Configuration Screens | plan-store-foundation | 2026-03-22 |
| pending | `plan-integration-polish_20260322` | Plan Integration & Polish | plan-config-screens | 2026-03-22 |

## Dependency Graph

```
project-foundation
  └─► zustand-stores
        ├─► home-history-screens ─┐
        └─► workout-flow-screens ─┤
                                  └─► polish-accessibility
                                        └─► e2e-deploy

plan-store-foundation
  └─► plan-config-screens
        └─► plan-integration-polish
```

## Task Summary

| Track | Phases | Tasks |
| ----- | ------ | ----- |
| Project Foundation | 7 | 26 |
| Zustand Stores | 6 | 30 |
| Home & History Screens | 6 | 18 |
| Workout Flow Screens | 7 | 30 |
| Polish & Accessibility | 5 | 16 |
| E2E Tests & Deployment | 5 | 14 |
| Plan Store Foundation | 7 | 28 |
| Plan Configuration Screens | 6 | 18 |
| Plan Integration & Polish | 7 | 20 |
| **Total** | **56** | **200** |
