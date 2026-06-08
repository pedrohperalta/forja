import { describe, expect, it } from 'vitest'

import { GET } from './route'

describe('GET /api/health', () => {
  it('returns 200', async () => {
    const response = await GET()

    expect(response.status).toBe(200)
  })

  it('returns ok true', async () => {
    const response = await GET()

    await expect(response.json()).resolves.toEqual({ ok: true })
  })
})
