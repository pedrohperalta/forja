import { randomUUID } from 'node:crypto'

import { NextResponse } from 'next/server'

import { AppError } from './appError'

export type ErrorCode =
  | 'invalid_request'
  | 'unauthenticated'
  | 'forbidden'
  | 'invalid_cursor'
  | 'validation_error'
  | 'not_found'
  | 'upload_too_large'
  | 'unsupported_media_type'
  | 'model_output_invalid'
  | 'invalid_token'
  | 'oauth_error'
  | 'internal_error'

export function requestId(headers: Headers): string {
  return headers.get('x-request-id') ?? randomUUID()
}

export function jsonWithRequestId<T>(body: T, status: number, id: string): NextResponse<T> {
  const response = NextResponse.json(body, { status })
  response.headers.set('x-request-id', id)

  return response
}

export function errorResponse(
  code: ErrorCode,
  message: string,
  status: number,
  id: string,
): NextResponse<{ error: { code: ErrorCode; message: string; requestId: string } }> {
  return jsonWithRequestId(
    {
      error: {
        code,
        message,
        requestId: id,
      },
    },
    status,
    id,
  )
}

/**
 * Maps any thrown value to a JSON error response. `AppError`s carry their own
 * code/status; a JSON parse `SyntaxError` becomes `invalid_request`; anything
 * else is logged and reported as a generic `internal_error` (no detail leaks).
 */
export function toErrorResponse(
  error: unknown,
  id: string,
): NextResponse<{ error: { code: ErrorCode; message: string; requestId: string } }> {
  if (error instanceof AppError) {
    return errorResponse(
      error.code,
      error.expose ? error.message : 'Unexpected error',
      error.status,
      id,
    )
  }

  if (error instanceof SyntaxError) {
    return errorResponse('invalid_request', 'Invalid JSON body', 400, id)
  }

  console.error('Unhandled route error', error)

  return errorResponse('internal_error', 'Internal server error', 500, id)
}
