import { mkdtemp, readFile, rm, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import test from 'node:test'
import assert from 'node:assert/strict'

const execFileAsync = promisify(execFile)
const ROOT = new URL('../..', import.meta.url).pathname
const DEPLOY_DIR = join(ROOT, 'deploy', 'forja')

test('compose config declares the expected Portainer stack services', async () => {
  const compose = await readFile(join(DEPLOY_DIR, 'compose.yml'), 'utf8')

  assert.match(compose, /forja-web:/)
  assert.match(compose, /forja-postgres:/)
  assert.match(compose, /forja-backup:/)
  assert.match(compose, /image: postgres:18-alpine/)
  assert.match(compose, /root_default:/)
  assert.match(compose, /external: true/)
  assert.match(compose, /\/api\/health/)
  assert.match(compose, /\/var\/lib\/postgresql/)
  assert.doesNotMatch(compose, /\/var\/lib\/postgresql\/data/)
  assert.match(compose, /\/data\/uploads/)
})

test('local compose override exposes Postgres only on localhost', async () => {
  const compose = await readFile(join(DEPLOY_DIR, 'compose.local.yml'), 'utf8')

  assert.match(compose, /127\.0\.0\.1:55432:5432/)
  assert.match(compose, /127\.0\.0\.1:3000:3000/)
  assert.match(compose, /\.env\.example/)
  assert.match(compose, /FORJA_PUBLIC_URL: http:\/\/127\.0\.0\.1:3000/)
})

test('web Dockerfile builds a non-root Node 24 standalone image', async () => {
  const dockerfile = await readFile(join(ROOT, 'web', 'Dockerfile'), 'utf8')

  assert.match(dockerfile, /FROM node:24-alpine/)
  assert.match(dockerfile, /pnpm --filter @forja\/web build/)
  assert.match(dockerfile, /COPY --from=builder .*standalone/)
  assert.match(dockerfile, /USER nextjs/)
  assert.match(dockerfile, /\/data\/uploads/)
})

test('backup script supports dry-run without creating artifacts', async () => {
  const backupDir = await mkdtemp(join(tmpdir(), 'forja-backup-'))
  const { stdout } = await execFileAsync('bash', [join(DEPLOY_DIR, 'scripts', 'backup.sh')], {
    env: {
      ...process.env,
      BACKUP_DIR: backupDir,
      DATABASE_URL: 'postgres://forja:forja@forja-postgres:5432/forja',
      DRY_RUN: '1',
    },
  })

  assert.match(stdout, /DRY RUN/)
  await assert.rejects(readFile(join(backupDir, 'latest.sql.gz')))
  await rm(backupDir, { recursive: true, force: true })
})

test('backup retention deletes artifacts older than the configured window', async () => {
  const backupDir = await mkdtemp(join(tmpdir(), 'forja-retention-'))
  const oldFile = join(backupDir, 'old.sql.gz')
  const freshFile = join(backupDir, 'fresh.sql.gz')
  await writeFile(oldFile, 'old')
  await writeFile(freshFile, 'fresh')

  const oldDate = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)
  await utimes(oldFile, oldDate, oldDate)

  await execFileAsync('bash', [join(DEPLOY_DIR, 'scripts', 'backup.sh'), '--retention-only'], {
    env: {
      ...process.env,
      BACKUP_DIR: backupDir,
      RETENTION_DAYS: '14',
    },
  })

  await assert.rejects(readFile(oldFile))
  assert.equal(await readFile(freshFile, 'utf8'), 'fresh')
  await rm(backupDir, { recursive: true, force: true })
})

test('restore script has a dry-run verification mode for temporary databases', async () => {
  const { stdout } = await execFileAsync(
    'bash',
    [join(DEPLOY_DIR, 'scripts', 'restore.sh'), '--dry-run', '--target-url', 'postgres://forja:forja@localhost:55432/forja_restore_check', 'backup.sql.gz'],
    { env: process.env },
  )

  assert.match(stdout, /DRY RUN/)
  assert.match(stdout, /forja_restore_check/)
})
