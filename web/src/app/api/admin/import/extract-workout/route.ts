import { AdminImportExtractWorkoutRequestSchema } from '@forja/domain'

import {
  ADMIN_SESSION_COOKIE,
  getAdminUserFromSessionToken,
} from '@/server/auth/adminAuth'
import { getDatabase } from '@/server/db/client'
import { readServerEnv } from '@/server/env'
import {
  errorResponse,
  jsonWithRequestId,
  requestId,
} from '@/server/http/responses'
import { createImportJob } from '@/server/repositories'
import {
  extractWorkoutFromImage,
  ImportServiceError,
  readImportEnv,
} from '@/server/services/import/workoutImportService'

export async function POST(request: Request): Promise<Response> {
  const id = requestId(request.headers)
  const db = getDatabase()
  const admin = await getAdminUserFromSessionToken({
    db,
    env: readServerEnv(),
    sessionToken: getCookieValue(request.headers, ADMIN_SESSION_COOKIE),
    now: new Date(),
  })

  if (!admin) {
    return errorResponse('unauthenticated', 'Unauthenticated', 401, id)
  }

  const body = await readRequestBody(request)
  const parsed = AdminImportExtractWorkoutRequestSchema.safeParse(body)

  if (!parsed.success) {
    return errorResponse('invalid_request', 'Invalid import request', 400, id)
  }

  try {
    const result = await extractWorkoutFromImage({
      ...parsed.data,
      env: readImportEnv(),
    })

    await createImportJob(db, {
      userId: admin.id,
      label: parsed.data.label,
      status: 'completed',
      completedAt: new Date(),
      now: new Date(),
    })

    return jsonWithRequestId(result, 200, id)
  } catch (error) {
    if (isImportError(error)) {
      await createImportJob(db, {
        userId: admin.id,
        label: parsed.data.label,
        status: 'failed',
        errorMessage: error.message,
        completedAt: new Date(),
        now: new Date(),
      })

      return importErrorResponse(error, id)
    }

    return errorResponse('internal_error', 'Import failed', 500, id)
  }
}

async function readRequestBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get('content-type') ?? ''

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    const image = formData.get('image')
    const label = formData.get('label')

    if (!(image instanceof Blob) || typeof label !== 'string') {
      return null
    }

    return {
      image: Buffer.from(await image.arrayBuffer()).toString('base64'),
      label,
    }
  }

  return request.json()
}

function getCookieValue(headers: Headers, name: string): string | null {
  const cookie = headers.get('cookie')
  if (!cookie) {
    return null
  }

  const prefix = `${name}=`
  const pair = cookie
    .split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(prefix))

  return pair?.slice(prefix.length) ?? null
}

function isImportError(error: unknown): error is ImportServiceError {
  return error instanceof ImportServiceError || hasImportErrorShape(error)
}

function hasImportErrorShape(error: unknown): error is ImportServiceError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof error.code === 'string' &&
    typeof error.message === 'string'
  )
}

function importErrorResponse(error: ImportServiceError, id: string): Response {
  if (error.code === 'upload_too_large') {
    return errorResponse(error.code, error.message, 413, id)
  }

  if (error.code === 'unsupported_media_type') {
    return errorResponse(error.code, error.message, 415, id)
  }

  if (error.code === 'model_output_invalid') {
    return errorResponse(error.code, error.message, 422, id)
  }

  if (error.code === 'invalid_request') {
    return errorResponse(error.code, error.message, 400, id)
  }

  return errorResponse('internal_error', 'Import failed', 500, id)
}
