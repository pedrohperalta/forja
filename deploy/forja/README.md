# Forja VPS Deployment

Portainer stack name: `forja`.

Production checkout:

```sh
/root/projects/forja
```

Preflight from a local machine:

```sh
ssh phperalta.me 'cd /root/projects/forja && git -c safe.directory=/root/projects/forja status --short --branch'
```

Update and build on the VPS:

```sh
ssh phperalta.me 'cd /root/projects/forja && git pull --ff-only'
ssh phperalta.me 'cd /root/projects/forja && docker build -f web/Dockerfile -t forja-web:latest .'
ssh phperalta.me 'cd /root/projects/forja && pnpm --filter @forja/web db:migrate'
```

Then update/redeploy the Portainer stack `forja` using `deploy/forja/compose.yml`.

Verify:

```sh
curl -fsS https://forja.phperalta.me/api/health
```

Local Postgres exposure for development/tests:

```sh
docker compose -f deploy/forja/compose.yml -f deploy/forja/compose.local.yml up forja-postgres
```

Backups:

```sh
BACKUP_DIR=/tmp/forja-backups DRY_RUN=1 deploy/forja/scripts/backup.sh
deploy/forja/scripts/backup.sh
```

Restore into a temporary verification database:

```sh
deploy/forja/scripts/restore.sh --dry-run --target-url postgres://forja:forja@localhost:55432/forja_restore_check backup.sql.gz
deploy/forja/scripts/restore.sh --target-url postgres://forja:forja@localhost:55432/forja_restore_check backup.sql.gz
```

Production notes:

- `forja-web` joins external Docker network `root_default` for Traefik.
- Traefik routes `Host(`forja.phperalta.me`)` to port `3000`.
- The production router uses `cloudflare-only@file`.
- Direct VPS IP access is not a supported client path.
- Future `forja.p3ralta.dev` routing stays disabled until DNS exists.
- Generate secrets with `openssl rand -base64 48`; never commit real `.env` files.
- Fix forward by committing, pulling on the VPS, rebuilding `forja-web:latest`, and redeploying the stack.
