# Forja

Monorepo with the Forja mobile app, admin web app, and shared domain package.

## Requirements

- Node.js 24
- pnpm 10.24.0
- Android Studio / emulator for Android local testing

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

## Run The Mobile App

Start Expo pointing the app to the local web API:

```sh
EXPO_PUBLIC_FORJA_API_URL=http://$(ipconfig getifaddr en0):3000 pnpm --filter @forja/mobile start -- --host lan
```

For an Android emulator, keep the web app running and expose port `3000` to the emulator:

```sh
adb reverse tcp:3000 tcp:3000
EXPO_PUBLIC_FORJA_API_URL=http://localhost:3000 pnpm --filter @forja/mobile android
```

If you are using an existing development build instead of rebuilding the app, start Expo and switch
to development build mode:

```sh
EXPO_PUBLIC_FORJA_API_URL=http://localhost:3000 pnpm --filter @forja/mobile start -- --host lan
```

Then press `s` in the Expo terminal.

## Useful Commands

```sh
pnpm test
pnpm typecheck
pnpm lint
pnpm check:slice0
pnpm --filter @forja/web build
```

Web-only commands:

```sh
pnpm --filter @forja/web test
pnpm --filter @forja/web typecheck
pnpm --filter @forja/web build
```

Mobile-only commands:

```sh
pnpm --filter @forja/mobile test
pnpm --filter @forja/mobile typecheck
pnpm --filter @forja/mobile lint
```
