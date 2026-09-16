import { AdminImportExtractWorkoutRequestSchema } from '@forja/domain'

import { createDefaultMobileAuthService } from '@/server/auth/defaultService'
import { readServerEnv } from '@/server/env'
import { errorResponse, jsonWithRequestId, requestId, toErrorResponse } from '@/server/http/responses'
import {
  ImportServiceError,
  extractWorkoutFromImage,
  readImportEnv,
} from '@/server/services/import/workoutImportService'

const IMPORT_ERROR_STATUS: Record<ImportServiceError['code'], number> = {
  invalid_request: 400,
  unsupported_media_type: 415,
  upload_too_large: 413,
  model_output_invalid: 422,
  internal_error: 500,
}

/**
 * POST /api/mobile/v1/import/extract-workout
 * Bearer-authenticated AI extraction (Claude Vision) — reuses the admin
 * import service; the ANTHROPIC_API_KEY never leaves the server.
 */
export async function POST(request: Request): Promise<Response> {
  const id = requestId(request.headers)

  try {
    await createDefaultMobileAuthService().getCurrentMobileUser({
      authorization: request.headers.get('authorization'),
    })

    const body: unknown = await request.json().catch(() => null)
    const parsed = AdminImportExtractWorkoutRequestSchema.safeParse(body)

    if (!parsed.success) {
      return errorResponse('invalid_request', 'Invalid import request', 400, id)
    }

    const result = await extractWorkoutFromImage({
      image: parsed.data.image,
      label: parsed.data.label,
      env: readImportEnv(),
    })

    return jsonWithRequestId(result, 200, id)
  } catch (error) {
    if (error instanceof ImportServiceError) {
      return errorResponse(error.code, error.message, IMPORT_ERROR_STATUS[error.code], id)
    }
    return toErrorResponse(error, id)
  }
}
