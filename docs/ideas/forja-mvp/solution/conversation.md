# Solution Design Conversation — Forja

## Q1: Qual abordagem de navegação prefere para o app?
**Resposta:** Expo Router (Recommended) — file-based routing nativo do Expo SDK 50+. Convenção sobre configuração, deep linking automático.

## Q2: Como prefere persistir os dados localmente (pesos, histórico, planos)?
**Resposta:** AsyncStorage para começar, mas posteriormente ter uma funcionalidade de fazer sync desses dados com a nuvem.

## Q3: Qual abordagem de gerenciamento de estado prefere?
**Resposta:** Zustand (Recommended) — leve, sem boilerplate, persist middleware nativo que integra direto com AsyncStorage. Ideal para apps de tamanho médio.

## Q4: Timer de descanso — foreground only ou notificação em background?
**Resposta:** Apenas foreground na v1 (vibração + som quando o timer termina). Notificação push local em background deve ser uma evolução posterior (v2).

## Q5: Alinhamento com conductor/ (v1 → v2)
**Ação:** Reescrita completa do solution-design.html para alinhar com todas as definições da pasta `conductor/`.

**Mudanças principais:**
- **Storage:** AsyncStorage → react-native-mmkv (20-30x mais rápido, leitura síncrona)
- **Reanimated:** 3.x → ^4.2.3 (CSS animations API)
- **Styling:** Adicionado NativeWind ^4.2 (Tailwind CSS para RN)
- **Lists:** Adicionado @shopify/flash-list v2 (New Arch only)
- **Validação:** Adicionado Zod (safeParse em fronteiras de storage)
- **Compilador:** Adicionado React Compiler v1.0 (memoização automática)
- **Gestos:** Adicionado react-native-gesture-handler ^2.30
- **Arquitetura:** New Architecture obrigatória (Fabric + TurboModules + JSI)
- **Estrutura:** `app/` → `src/app/` com `@/` path aliases
- **Desenvolvimento:** Expo Go → Development builds
- **Tipos:** Branded types (ExerciseId, WorkoutId, PlanId), discriminated unions
- **Zustand v5:** Atomic selectors, useShallow, partialize, version+migrate, MMKV adapter
- **TDD:** Política strict — testes antes da implementação
- **Testes:** Jest 30, RNTL v13, expo-router/testing-library, Maestro E2E
- **Qualidade:** ESLint flat config, Prettier, Lefthook, commitlint
- **Acessibilidade:** Touch targets 44x44, contraste 4.5:1, roles semânticos
- **Haptics:** useHaptics hook centralizado (expo-haptics)
- **Nova seção:** Qualidade & Padrões (§8)
- **Nova seção:** Acessibilidade (§10)

## Q6: Especificação técnica por tela (v2 → v3)
**Pedido:** O documento estava muito focado em tecnologias e pouco nas telas. Detalhar como cada tela será implementada de um ponto de vista técnico.

**Ação:** Adicionada seção "ESPECIFICAÇÃO POR TELA" dentro da §5 (Navegação & Telas) com 6 cards detalhados:

1. **Home** (`index.tsx`): WorkoutCard × 3, HistoryChip, lógica "PRÓXIMO" (planId com lastDate mais antigo), screen state always idle (MMKV síncrono)
2. **Exercise** (`(workout)/exercise.tsx`): ProgressBar, WeightInput, SeriesDots, skip/remove condicionais (só série 1), screen state discriminated union, navegação pós-série (rest/complete/checkpoint)
3. **Rest Timer** (`(workout)/rest.tsx`): RestTimer SVG, useRestTimer hook, haptics 3-2-1, transição de cor accent→danger, botão "ir ao pulado" condicional
4. **Checkpoint** (`(workout)/checkpoint.tsx`): FlashList de PendingExerciseCard, returnToSkipped/skipAllPending, dois botões por card
5. **Complete** (`(workout)/complete.tsx`): stats grid 3 cols, FlashList resumo, saveWorkout guard (useRef), router.replace('/') limpa stack
6. **History** (`/history.tsx`): FlashList de WorkoutHistoryCard, delete inline (não modal), deletingId local state, empty state

Cada card especifica: rota, componentes, store selectors, ações, screen state type, layout NativeWind, acessibilidade, e notas de implementação.

## Q7: Design System & Tokens (v3 → v4)
**Pedido:** Garantir que o layout final fique parecido com o definido na PRD. Faltava o mapeamento concreto de design tokens → NativeWind theme.

**Ação:** Adicionada nova §4 "Design System & Tokens" (seções 04–14 renumeradas). Conteúdo:

- **tailwind.config.js completo**: cores (background, surface, surface-2, border, border-med, accent, accent-dim, accent-glow, danger, warning, info, text, text-med, muted, dim), fontFamily (display: BebasNeue, ui: Syne), borderRadius (sm 8px, md 12px, lg 16px, pill 100px), boxShadow (sm, md, lg)
- **Paleta de cores**: tabela PRD token → hex → classe NativeWind → uso
- **Tipografia**: tabela elemento → fonte → tamanho → peso → classe NativeWind (10 variantes)
- **Medidas de componentes**: touch target 44×44, botão CTA 52px, botão secundário 46px, weight input 56px, timer ring 180px, set dot 26×5px, progress bar 3px, card padding, safe area
- **Referência rápida**: mapeamento visual completo PRD → NativeWind para backgrounds, text, borders, radius, typography, shadows
- **Limitações RN**: box-shadow, rgba, letter-spacing, glow/filter
