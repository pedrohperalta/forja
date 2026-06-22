import { afterEach, describe, expect, it, vi } from 'vitest'

import { getUploadsDir } from './equipmentPhotoService'

describe('equipment photo service', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('uses a local uploads directory when UPLOADS_DIR is not configured', () => {
    vi.stubEnv('UPLOADS_DIR', '')

    expect(getUploadsDir()).toContain('.uploads')
  })

  it('uses the configured uploads directory when provided', () => {
    vi.stubEnv('UPLOADS_DIR', '/data/uploads')

    expect(getUploadsDir()).toBe('/data/uploads')
  })
})
