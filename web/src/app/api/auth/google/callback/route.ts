import { NextResponse } from 'next/server'

import { createDefaultMobileAuthService } from '@/server/auth/defaultService'
import { errorResponse, requestId } from '@/server/http/responses'

export async function GET(request: Request): Promise<Response> {
  const id = requestId(request.headers)
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  if (!code || !state) {
    return errorResponse('oauth_error', 'Invalid OAuth callback', 400, id)
  }

  try {
    const result = await createDefaultMobileAuthService().handleGoogleCallback({
      code,
      state,
    })
    const response = NextResponse.redirect(result.redirectUrl)
    response.headers.set('x-request-id', id)

    if (result.adminSessionToken) {
      response.cookies.set('forja_admin_session', result.adminSessionToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      })
    }

    return response
  } catch (error) {
    return errorResponse(
      'oauth_error',
      error instanceof Error ? error.message : 'OAuth error',
      401,
      id,
    )
  }
}
