import { randomUUID } from 'node:crypto'

import { NextResponse } from 'next/server'

export type ErrorCode =
  | 'invalid_request'
  | 'unauthenticated'
  | 'forbidden'
  | 'invalid_cursor'
  | 'validation_error'
  | 'invalid_token'
  | 'oauth_error'
  | 'internal_error'

export function requestId(headers: Headers): string {
  return headers.get('x-request-id') ?? randomUUID()
}

export function jsonWithRequestId<T>(
  body: T,
  status: number,
  id: string,
): NextResponse<T> {
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
