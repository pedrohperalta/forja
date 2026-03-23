# Solution Design Conversation — Training Configuration

## Q1: Store dedicado ou appStore existente?
**A:** Novo planStore (recomendado) — separação clara de responsabilidades, migração independente.

## Q2: Formato de IDs dos planos?
**A:** UUID internamente, mas com indicador visual A/B/C/... na UI. IDs internos são UUID branded, o label é uma letra sequencial para exibição.

## Q3: Reordenação de exercícios — drag-and-drop ou botões?
**A:** Drag-and-drop usando react-native-draggable-flatlist.

## Q4: Formulário de exercício — nova tela ou bottom sheet?
**A:** Nova tela (push navigation) — mais espaço, padrão consistente com o resto do app.

## Context from Codebase Exploration
- Exercise type currently lacks `restSeconds` (hardcoded to 60s in rest.tsx)
- Plan type lacks `label` field (uses id as display letter)
- appStore uses PlanId in lastDates and history — needs remapping during migration
- Home reads from hardcoded `PLANS` constant
- useRestTimer hook already accepts durationSeconds parameter — only rest.tsx needs change
- buildWorkoutSession already snapshots planName/focus — history immutability works as-is
- WorkoutId format `${planId}-${startedAt}` will use new UUID naturally
