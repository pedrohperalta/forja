# Forja

Monorepo with the Forja admin web app and the shared domain package. The
backend API also serves mobile clients (the mobile app itself lives in a
separate repository).

## Requirements

- Node.js 24
- pnpm 10.24.0

## Install

```sh
pnpm install
```

## Run The Admin Web App

Start the Next.js admin on port `3000`:

```sh
pnpm --filter @forja/web dev --hostname 0.0.0.0 --port 3000
```

Open:

```text
http://localhost:3000/admin
```

If you need to test from another device on the same network, replace `localhost` with this
machine's local IP:

```sh
ipconfig getifaddr en0
```

Example:

```text
http://192.168.10.216:3000/admin
```

## Useful Commands

```sh
pnpm test
pnpm typecheck
pnpm lint
pnpm verify
pnpm check:slice0
```

Web-only commands:

```sh
pnpm --filter @forja/web test
pnpm --filter @forja/web typecheck
pnpm --filter @forja/web lint
pnpm --filter @forja/web build
```

Domain-only commands:

```sh
pnpm --filter @forja/domain test
pnpm --filter @forja/domain typecheck
```
