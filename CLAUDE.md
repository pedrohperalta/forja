# Forja — Project Instructions

## Mandatory Context

Before writing any code, read and follow these files:

- **Architecture & Tech Stack**: `docs/ARCHITECTURE.md` — all technology choices, versions, and architecture decisions
- **Web conventions**: `web/AGENTS.md` — layering, error handling, validation, and testing rules for `@forja/web`
- **Workflow**: `CONTRIBUTING.md` — TDD policy (strict), commit strategy, language rules

## Key Rules

- **TDD is strict**: write failing tests first, then implement
- **Conventional Commits**: `feat:`, `fix:`, `test:`, etc.
- **Branching**: work on `track/<track-name>` branches, merge to `main` when track is complete
- **Never push to `main` without explicit user confirmation**
- **All code and comments in English**, UI text in Portuguese (pt-BR)
- **Zod schemas live in `@forja/domain`**: prefer shared schemas over hand-written parallel types
- **Layering is enforced**: route handler → service → repository → db (see `web/AGENTS.md`)
- **Tests colocated** with source files; integration tests (`*.integration.test.ts`) run only via `pnpm --filter @forja/web test:db`

## Criação de PRDs

Quando o usuário pedir para criar um PRD, seguir este processo:

1. **Explorar o projeto** — ler os PRDs existentes em `docs/ideas/` para entender o estilo e formato
2. **Criar a pasta** — `docs/ideas/<feature_slug>/discovery/`
3. **Escrever o PRD** — arquivo `prd.html` seguindo o estilo dos PRDs existentes (Inter font, dark theme, review mode com sistema de comentários, mockups inline, user stories com critérios de aceitação)
4. **Atualizar o index** — adicionar card novo em `docs/index.html` com número sequencial e badge "Nova"
5. **Fazer o commit e push na `main`**:
   ```
   git add docs/
   git commit -m "docs: add PRD for <feature>"
   git push origin main
   ```
6. **Colar o link da GitHub Page** para o usuário:
   - Index: `https://pedrohperalta.github.io/forja/`
   - PRD direto: `https://pedrohperalta.github.io/forja/ideas/<feature_slug>/discovery/prd.html`


## Workflow

Development follows the **superpowers** loop (brainstorming → writing-plans → implementation with strict TDD → finishing-a-development-branch). See `CONTRIBUTING.md` for the contribution workflow and local gates, and `docs/engineering/index.html` for the end-to-end flow.
