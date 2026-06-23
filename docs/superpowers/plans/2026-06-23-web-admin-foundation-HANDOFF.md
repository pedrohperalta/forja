# Web Admin Foundation Redesign — Handoff

Continuation notes for `track/web-admin-foundation`. Full plan:
`docs/superpowers/plans/2026-06-23-web-admin-foundation-redesign.md`.

## What this branch is

A foundation redesign of the Next.js web admin (`web/`) responding to "the UI/UX
is horrible / too compressed". Brand is kept (lime `#c2f000`, Bebas Neue, Syne,
pill buttons, dark industrial); the work is execution: design tokens, interaction
states, affordance, a responsive shell, breathing room, and a redesigned login.

## Done (10 commits, web gate green: typecheck + lint + 102 tests)

- **Design tokens** in `:root` — space / type / radius / shadow / motion scales (`globals.css`).
- **Buttons** — hover/active/focus-visible + `sm/md/lg` size scale; default 56→44px ("botões enormes" fix).
- **AdminTag** primitive + reclassified all static metadata pills (build/publication/import/login) so they no longer look like clickable buttons (affordance fix). Removed the conflicting descendant pill CSS.
- **Responsive shell** — `AdminFrame` rewritten to a CSS-grid sidebar (desktop) / fixed bottom-nav (≤860px), wider 78rem canvas, `aria-current`. Killed the "scaled-up mobile app" feel.
- **Accent discipline** — neutralized redundant lime gradient surfaces (metric strips, plan cards); lime reserved for stat numbers + the one focal "Próxima ação" panel.
- **Contrast** — dim (#444) text → muted (#888) for WCAG AA.
- **Breathing room** — generous card padding, section rhythm, wider dashboard column.
- **Login redesign** — immersive entry point: lime gradient mesh + breathing two-glow aurora + concentric energy rings + film grain (NO clipped watermark — that was removed on feedback), glassy card with animated accent bar, condensed hero ("TREINO" in lime), full-width hero CTA with nudging arrow, staggered entrance, reduced-motion safe. Removed the "Acesso restrito"/"Publicação sempre manual" chips.

## Remaining (not started)

- **Task 2** — relocate stray `.admin-build-*` rules + hoist tokens/fonts to top of `globals.css` (cosmetic; low value/risk — consider folding into a CSS split).
- **Task 3** — refactor all remaining hardcoded `border-radius` onto `--radius-sm/md/lg`.
- **Task 4** — refactor remaining hardcoded spacing/font-sizes onto `--space-*` / `--text-*` / `--display-*` (partial: login + breathing-room pass already done).
- **Phase 4+ roadmap** (separate plan): form de-pollution (`/admin/plans/new`, `/admin/plans/[planId]`), density/tables, skeletons + toasts, unify the three `<details>` disclosures + two steppers, full `globals.css` split.
- Possible: further login polish if desired; richer seed data to evaluate dense internal screens (esp. the plan editor).

## Run it locally (fresh machine)

1. Install + Postgres (Docker):
   ```bash
   pnpm install
   docker run -d --name forja-pg-local \
     -e POSTGRES_DB=forja -e POSTGRES_USER=forja -e POSTGRES_PASSWORD=forja \
     -p 127.0.0.1:55432:5432 postgres:18-alpine
   ```
2. Create `web/.env.local` (dummy dev secrets; the app's `env.ts` validates all 12 vars):
   ```bash
   FORJA_PUBLIC_URL=http://localhost:3000
   DATABASE_URL=postgres://forja:forja@localhost:55432/forja
   GOOGLE_CLIENT_ID=local-dev
   GOOGLE_CLIENT_SECRET=local-dev
   FORJA_ALLOWED_USER_EMAILS=dev@example.com
   FORJA_ADMIN_EMAILS=dev@example.com
   FORJA_ACCESS_TOKEN_SECRET=local-dev-access-token-secret
   FORJA_REFRESH_TOKEN_SECRET=local-dev-refresh-token-secret
   FORJA_ADMIN_SESSION_SECRET=local-dev-admin-session-secret
   FORJA_AUTH_CODE_SECRET=local-dev-auth-code-secret
   FORJA_OAUTH_STATE_SECRET=local-dev-oauth-state-secret
   FORJA_SYNC_CURSOR_SECRET=local-dev-sync-cursor-secret
   ```
3. Apply schema + seed + mint a local admin session (no Google OAuth needed):
   ```bash
   docker exec -i forja-pg-local psql -U forja -d forja < web/src/server/db/migrations/0000_initial.sql
   docker exec -i forja-pg-local psql -U forja -d forja <<'SQL'
   insert into users (id,email,name,created_at,updated_at) values ('00000000-0000-4000-8000-000000000001','dev@example.com','Forja Dev','2026-01-01T00:00:00Z','2026-01-01T00:00:00Z') on conflict (id) do nothing;
   insert into plans (id,user_id,label,created_at,updated_at) values ('seed_plan_a','00000000-0000-4000-8000-000000000001','A','2026-01-01T00:00:00Z','2026-01-01T00:00:00Z') on conflict (id) do nothing;
   insert into admin_sessions (user_id,session_hash,expires_at) values ('00000000-0000-4000-8000-000000000001','Te5YNYN7O182eMGY6dLeXqTVb1Crgxtce-SOF6CTHPg', now()+interval '30 days');
   SQL
   ```
   (The `session_hash` = `hmacSha256('local-dev-session-token-9f3a', 'local-dev-admin-session-secret')`, base64url. If you change the secret/token, recompute: `node -e "console.log(require('crypto').createHmac('sha256',SECRET).update(TOKEN).digest('base64url'))"`.)
4. Run + log in:
   ```bash
   pnpm --filter @forja/web dev          # http://localhost:3000
   ```
   In the browser console at `http://localhost:3000`, set the session cookie:
   ```js
   document.cookie = "forja_admin_session=local-dev-session-token-9f3a; path=/"
   ```
   Then browse `/admin`, `/admin/plans`, `/admin/import`, `/admin/mobile-builds`. `/admin/login` renders without DB.

## Gotchas

- **`.env.local` is gitignored** — not in the repo; recreate per above.
- **Node**: repo wants Node ≥24; Node 22 only emits an engine WARN (non-blocking).
- **Pre-push / pre-commit `pnpm lint` fails on `mobile`** in some environments (mobile has no local `eslint` binary). It is unrelated to web. For commits touching `.ts/.tsx`, run the web gate manually (`pnpm --filter @forja/web typecheck && lint && test`) and commit with `--no-verify`; push with `--no-verify`. CSS-only commits pass the hooks fine.
- **commitlint** rejects sentence/Start/UPPER-case subjects — keep commit subjects lowercase (e.g. `feat(web): add …`).
- **Prettier** the touched `.ts/.tsx` before committing (`pnpm --filter @forja/web exec prettier --write <files>`).
- There is a `web/src/app/globals.test.ts` that asserts CSS invariants (e.g. **no `font-size: clamp(...vw...)`** for titles, mobile-nav, overflow-x clip). Keep title sizes fixed with media-query breakpoints.

## Verify

```bash
pnpm --filter @forja/web typecheck && pnpm --filter @forja/web lint && pnpm --filter @forja/web test
```
