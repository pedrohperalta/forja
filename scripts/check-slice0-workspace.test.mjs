import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))

test('Slice 0 workspace layout is configured', () => {
  const rootPackage = readJson('package.json')

  assert.equal(rootPackage.private, true)
  assert.equal(rootPackage.packageManager?.startsWith('pnpm@'), true)
  assert.deepEqual(rootPackage.workspaces, ['mobile', 'web', 'packages/*'])
  assert.deepEqual(rootPackage.engines, { node: '>=24 <25' })

  assert.equal(existsSync('.nvmrc'), true)
  assert.equal(readFileSync('.nvmrc', 'utf8').trim(), '24')
  assert.equal(existsSync('pnpm-workspace.yaml'), true)
  assert.equal(existsSync('pnpm-lock.yaml'), true)
  assert.equal(existsSync('package-lock.json'), false)
})

test('mobile workspace keeps the Expo app entry points', () => {
  const mobilePackage = readJson('mobile/package.json')

  assert.equal(mobilePackage.name, '@forja/mobile')
  assert.equal(mobilePackage.main, 'expo-router/entry')
  assert.equal(existsSync('mobile/app.json'), true)
  assert.equal(existsSync('mobile/src/app/_layout.tsx'), true)
  assert.equal(existsSync('mobile/src/styles/global.css'), true)
  assert.equal(existsSync('mobile/assets/images/icon.png'), true)
})

test('future workspaces have reserved package names', () => {
  assert.equal(readJson('web/package.json').name, '@forja/web')
  assert.equal(readJson('packages/domain/package.json').name, '@forja/domain')
})

test('root scripts target the mobile workspace checks', () => {
  const rootPackage = readJson('package.json')

  assert.equal(rootPackage.scripts.test, 'pnpm --filter @forja/mobile test')
  assert.equal(rootPackage.scripts.typecheck, 'pnpm --filter @forja/mobile typecheck')
  assert.equal(rootPackage.scripts.lint, 'pnpm --filter @forja/mobile lint')
})

test('EAS workflows keep main and tag triggers in the mobile app directory', () => {
  const previewWorkflow = readFileSync('mobile/.eas/workflows/build-preview.yml', 'utf8')
  const releaseWorkflow = readFileSync('mobile/.eas/workflows/release-production.yml', 'utf8')

  assert.match(previewWorkflow, /branches: \['main'\]/)
  assert.match(releaseWorkflow, /tags: \['v\*'\]/)
  assert.equal(existsSync('mobile/eas.json'), true)
  assert.equal(existsSync('.eas/workflows/build-preview.yml'), false)
})
