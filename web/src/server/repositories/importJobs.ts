import * as schema from '../db/schema'
import { required, type Database, type ImportJobRow } from './types'

export type CreateImportJobInput = {
  userId: string | null
  label: string | null
  status: 'pending' | 'completed' | 'failed'
  errorMessage?: string | null
  completedAt?: Date | null
  now: Date
}

export async function createImportJob(
  db: Database,
  input: CreateImportJobInput,
): Promise<ImportJobRow> {
  const [job] = await db
    .insert(schema.importJobs)
    .values({
      userId: input.userId,
      label: input.label,
      status: input.status,
      errorMessage: input.errorMessage ?? null,
      completedAt: input.completedAt ?? null,
      createdAt: input.now,
    })
    .returning()

  return required(job)
}
