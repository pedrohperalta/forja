import { NextResponse } from 'next/server'

import {
  ADMIN_SESSION_COOKIE,
  logoutAdminSession,
} from '@/server/auth/adminAuth'
import { getDatabase } from '@/server/db/client'
import { readServerEnv } from '@/server/env'
import { requestId } from '@/server/http/responses'

export async function POST(request: Request): Promise<Response> {
  const id = requestId(request.headers)
  const cookie = request.headers
    .get('cookie')
    ?.split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${ADMIN_SESSION_COOKIE}=`))
  const sessionToken = cookie?.split('=')[1] ?? null

  await logoutAdminSession({
    db: getDatabase(),
    env: readServerEnv(),
    sessionToken,
    now: new Date(),
  })

  const response = NextResponse.json({ ok: true })
  response.headers.set('x-request-id', id)
  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })

  return response
}
