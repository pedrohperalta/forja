import { NextResponse } from 'next/server'

import { newAdminNonce, startAdminGoogleOAuth } from '@/server/auth/adminAuth'
import { readServerEnv } from '@/server/env'
import { errorResponse, requestId } from '@/server/http/responses'

export async function GET(request: Request): Promise<Response> {
  const id = requestId(request.headers)
  const url = new URL(request.url)
  const returnTo = url.searchParams.get('returnTo') ?? '/admin'

  try {
    const result = startAdminGoogleOAuth({
      returnTo,
      env: readServerEnv(),
      now: new Date(),
      nonce: newAdminNonce(),
    })
    const response = NextResponse.redirect(result.url)
    response.headers.set('x-request-id', id)

    return response
  } catch (error) {
    return errorResponse(
      'invalid_request',
      error instanceof Error ? error.message : 'Invalid request',
      400,
      id,
    )
  }
}
