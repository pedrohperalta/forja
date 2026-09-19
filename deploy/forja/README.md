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
- Direct VPS IP access is not a supported client path.
- Future `forja.p3ralta.dev` routing stays disabled until DNS exists.
- Generate secrets with `openssl rand -base64 48`; never commit real `.env` files.
- Fix forward by committing, pulling on the VPS, rebuilding `forja-web:latest`, and redeploying the stack.

## Nginx deployment on a separate Proxmox container

Use `compose.nginx.yml` when TLS and public routing are handled by Nginx on
another machine or container. On the Forja VM, create `deploy/forja/.env` from
`.env.example` and set:

```sh
FORJA_BIND_ADDRESS=192.168.10.240
FORJA_HTTP_PORT=3000
FORJA_REPO_DIR=/root/projetos/forja
```

Build and start the stack from the repository root:

```sh
docker build -f web/Dockerfile -t forja-web:latest .
docker compose --env-file deploy/forja/.env -f deploy/forja/compose.nginx.yml up -d
curl -fsS http://192.168.10.240:3000/api/health
```

The Nginx container must be able to reach `192.168.10.240:3000`. Copy the
relevant directives from `nginx/forja.conf.example` into the existing Nginx
configuration, preserve its certificate management directives, test with
`nginx -t`, and reload Nginx.

Only the web port is published by this Compose file. PostgreSQL remains on the
private `forja-internal` Docker network. Restrict TCP port 3000 at the Proxmox
firewall to the Nginx container IP before switching public traffic.

Before the final cutover, restore the old VPS database and uploads into the new
named volumes, verify `/api/health` through Nginx, then update DNS or stop the old
service. Keep the old VPS unchanged until application login, sync, uploads, and
backup restoration have been verified.
