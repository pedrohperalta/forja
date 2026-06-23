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
```

Then update/redeploy the Portainer stack `forja` using `deploy/forja/compose.yml`.
Set the variables from `deploy/forja/.env.example` in the Portainer stack environment;
do not commit the real `.env` file.

Apply database migrations after Postgres is healthy:

```sh
ssh phperalta.me 'cd /root/projects/forja && docker exec -i forja-postgres sh -c '\''psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1'\'' < web/src/server/db/migrations/0000_initial.sql'
```

Verify:

```sh
curl -fsS https://forja.phperalta.me/api/health
```

Mobile builds:

```sh
docker logs -f forja-web
```

Open `https://forja.phperalta.me/admin/mobile-builds` while logged in to start an APK
or AAB build and download finished artifacts. The web container mounts:

- `/root/projects/forja:/repo:ro` so the builder can read the source checkout.
- `/var/run/docker.sock:/var/run/docker.sock` so the admin route can run the Dockerized Android build.
- `forja-mobile-builds:/data/mobile-builds` for generated APK/AAB artifacts and logs.

Set `DOCKER_GID` to the host Docker socket group id when it is not `988`:

```sh
stat -c '%g' /var/run/docker.sock
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
- Traefik routes `Host($FORJA_HOST)` to port `3000`.
- The production router uses the existing Docker middleware `cf-only@docker`.
- The admin mobile build feature requires Docker socket access from `forja-web`.
- Direct VPS IP access is not a supported client path.
- Future `forja.p3ralta.dev` routing stays disabled until DNS exists.
- Generate secrets with `openssl rand -base64 48`; never commit real `.env` files.
- Fix forward by committing, pulling on the VPS, rebuilding `forja-web:latest`, and redeploying the stack.
