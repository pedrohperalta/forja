import { createImportJob, type Database, type ImportJobRow } from '@/server/repositories'

export type RecordImportJobInput = {
  userId: string
  label: string
  now: Date
}

export function recordCompletedImport(
  db: Database,
  input: RecordImportJobInput,
): Promise<ImportJobRow> {
  return createImportJob(db, {
    userId: input.userId,
    label: input.label,
    status: 'completed',
    completedAt: input.now,
    now: input.now,
  })
}

export type RecordFailedImportInput = RecordImportJobInput & {
  errorMessage: string
}

export function recordFailedImport(
  db: Database,
  input: RecordFailedImportInput,
): Promise<ImportJobRow> {
  return createImportJob(db, {
    userId: input.userId,
    label: input.label,
    status: 'failed',
    errorMessage: input.errorMessage,
    completedAt: input.now,
    now: input.now,
  })
}
