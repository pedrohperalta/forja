import { AdminImportExtractWorkoutRequestSchema } from '@forja/domain'

import { ADMIN_SESSION_COOKIE, getAdminUserFromSessionToken } from '@/server/auth/adminAuth'
import { getDatabase } from '@/server/db/client'
import { readServerEnv } from '@/server/env'
import { errorResponse, jsonWithRequestId, requestId } from '@/server/http/responses'
import {
  recordCompletedImport,
  recordFailedImport,
} from '@/server/services/import/importJobService'
import {
  extractWorkoutFromImage,
  ImportServiceError,
  readImportEnv,
} from '@/server/services/import/workoutImportService'

export async function POST(request: Request): Promise<Response> {
  const id = requestId(request.headers)
  const shouldRedirectOnImportResult = shouldRedirectBrowserImport(request)
  const db = getDatabase()
  const admin = await getAdminUserFromSessionToken({
    db,
    env: readServerEnv(),
    sessionToken: getCookieValue(request.headers, ADMIN_SESSION_COOKIE),
    now: new Date(),
  })

  if (!admin) {
    if (shouldRedirectOnImportResult || wantsHtmlResponse(request)) {
      return redirectWithRequestId(new URL('/admin/login', request.url), id)
    }

    return errorResponse('unauthenticated', 'Unauthenticated', 401, id)
  }

  const body = await readRequestBody(request)
  const parsed = AdminImportExtractWorkoutRequestSchema.safeParse(body)

  if (!parsed.success) {
    if (shouldRedirectOnImportResult) {
      return redirectToImportError(request.url, 'invalid_request', id)
    }

    return errorResponse('invalid_request', 'Invalid import request', 400, id)
  }

  try {
    const result = await extractWorkoutFromImage({
      ...parsed.data,
      mediaType: getRequestBodyMediaType(body),
      env: readImportEnv(),
    })

    await recordCompletedImport(db, {
      userId: admin.id,
      label: parsed.data.label,
      now: new Date(),
    })

    if (shouldRedirectOnImportResult) {
      return redirectToImportNotice(request.url, 'extraction_finished', id)
    }

    return jsonWithRequestId(result, 200, id)
  } catch (error) {
    if (isImportError(error)) {
      await recordFailedImport(db, {
        userId: admin.id,
        label: parsed.data.label,
        errorMessage: error.message,
        now: new Date(),
      })

      if (shouldRedirectOnImportResult) {
        return redirectToImportError(request.url, error.code, id)
      }

      return importErrorResponse(error, id)
    }

    return errorResponse('internal_error', 'Import failed', 500, id)
  }
}

function isMultipartFormSubmission(request: Request): boolean {
  return (request.headers.get('content-type') ?? '').includes('multipart/form-data')
}

function wantsHtmlResponse(request: Request): boolean {
  return (request.headers.get('accept') ?? '').includes('text/html')
}

function wantsJsonResponse(request: Request): boolean {
  return (request.headers.get('accept') ?? '').includes('application/json')
}

function shouldRedirectBrowserImport(request: Request): boolean {
  return (
    wantsHtmlResponse(request) ||
    (isMultipartFormSubmission(request) && !wantsJsonResponse(request))
  )
}

function redirectToImportError(requestUrl: string, errorCode: string, id?: string): Response {
  const url = new URL('/admin/import', requestUrl)
  url.searchParams.set('error', errorCode)

  return redirectWithRequestId(url, id)
}

function redirectToImportNotice(requestUrl: string, noticeCode: string, id: string): Response {
  const url = new URL('/admin/import', requestUrl)
  url.searchParams.set('notice', noticeCode)

  return redirectWithRequestId(url, id)
}

function redirectWithRequestId(url: URL, id?: string): Response {
  const headers = new Headers({ location: url.toString() })
  if (id) {
    headers.set('x-request-id', id)
  }

  return new Response(null, { headers, status: 303 })
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
      mediaType: getSupportedMediaType(image.type),
    }
  }

  return request.json()
}

function getSupportedMediaType(
  mediaType: string,
): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' {
  if (
    mediaType === 'image/jpeg' ||
    mediaType === 'image/png' ||
    mediaType === 'image/gif' ||
    mediaType === 'image/webp'
  ) {
    return mediaType
  }

  return 'image/jpeg'
}

function getRequestBodyMediaType(
  body: unknown,
): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' {
  if (typeof body !== 'object' || body === null || !('mediaType' in body)) {
    return 'image/jpeg'
  }

  const mediaType = body.mediaType

  return typeof mediaType === 'string' ? getSupportedMediaType(mediaType) : 'image/jpeg'
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
