import { describe, expect, it, vi } from 'vitest'

const createImportJob = vi.fn()

vi.mock('@/server/repositories', () => ({
  createImportJob: (db: unknown, input: unknown) => createImportJob(db, input),
}))

const { recordCompletedImport, recordFailedImport } = await import('./importJobService')

describe('importJobService', () => {
  it('records a completed import job', async () => {
    const db = { db: true }
    const now = new Date('2026-06-23T00:00:00.000Z')

    await recordCompletedImport(db as never, {
      userId: 'user-1',
      label: 'Ficha A',
      now,
    })

    expect(createImportJob).toHaveBeenCalledWith(db, {
      userId: 'user-1',
      label: 'Ficha A',
      status: 'completed',
      completedAt: now,
      now,
    })
  })

  it('records a failed import job with the error message', async () => {
    const db = { db: true }
    const now = new Date('2026-06-23T00:00:00.000Z')

    await recordFailedImport(db as never, {
      userId: 'user-1',
      label: 'Ficha A',
      errorMessage: 'model_output_invalid',
      now,
    })

    expect(createImportJob).toHaveBeenCalledWith(db, {
      userId: 'user-1',
      label: 'Ficha A',
      status: 'failed',
      errorMessage: 'model_output_invalid',
      completedAt: now,
      now,
    })
  })
})
