import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))

test('Slice 0 workspace layout is configured', () => {
  const rootPackage = readJson('package.json')

  assert.equal(rootPackage.private, true)
  assert.equal(rootPackage.packageManager?.startsWith('pnpm@'), true)
  assert.deepEqual(rootPackage.workspaces, ['web', 'packages/*'])
  assert.deepEqual(rootPackage.engines, { node: '>=24 <25' })

  assert.equal(existsSync('.nvmrc'), true)
  assert.equal(readFileSync('.nvmrc', 'utf8').trim(), '24')
  assert.equal(existsSync('pnpm-workspace.yaml'), true)
  assert.equal(existsSync('pnpm-lock.yaml'), true)
  assert.equal(existsSync('package-lock.json'), false)
})

test('workspaces have reserved package names', () => {
  assert.equal(readJson('web/package.json').name, '@forja/web')
  assert.equal(readJson('packages/domain/package.json').name, '@forja/domain')
})

test('root scripts target the workspace checks', () => {
  const rootPackage = readJson('package.json')

  assert.equal(
    rootPackage.scripts.test,
    'pnpm --filter @forja/domain test && pnpm --filter @forja/web test',
  )
  assert.equal(
    rootPackage.scripts.typecheck,
    'pnpm --filter @forja/domain typecheck && pnpm --filter @forja/web typecheck',
  )
})

test('the React Native mobile app is removed', () => {
  assert.equal(existsSync('mobile'), false)
  assert.equal(existsSync('build-apk.sh'), false)
  assert.equal(existsSync('build-apk.Dockerfile'), false)
  assert.equal(readFileSync('pnpm-workspace.yaml', 'utf8').includes('- mobile'), false)
})
