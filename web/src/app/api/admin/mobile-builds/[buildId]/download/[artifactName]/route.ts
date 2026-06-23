import { createReadStream } from 'node:fs'
import { Readable } from 'node:stream'

import { ADMIN_SESSION_COOKIE, getAdminUserFromSessionToken } from '@/server/auth/adminAuth'
import { getDatabase } from '@/server/db/client'
import { readServerEnv } from '@/server/env'
import { errorResponse, requestId } from '@/server/http/responses'
import { resolveMobileBuildArtifact } from '@/server/mobileBuilds'

export const runtime = 'nodejs'

type RouteContext = {
  params: Promise<{
    buildId: string
    artifactName: string
  }>
}

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const id = requestId(request.headers)
  const admin = await getAdmin(request)
  if (!admin) {
    return errorResponse('unauthenticated', 'Unauthenticated', 401, id)
  }

  const { buildId, artifactName } = await context.params

  try {
    const artifact = await resolveMobileBuildArtifact(buildId, artifactName)
    const stream = Readable.toWeb(createReadStream(artifact.path)) as ReadableStream

    return new Response(stream, {
      headers: {
        'content-disposition': `attachment; filename="${artifact.name}"`,
        'content-length': String(artifact.bytes),
        'content-type': artifact.name.endsWith('.aab')
          ? 'application/octet-stream'
          : 'application/vnd.android.package-archive',
      },
    })
  } catch {
    return errorResponse('not_found', 'Artifact not found', 404, id)
  }
}

async function getAdmin(request: Request): Promise<{ id: string } | null> {
  return getAdminUserFromSessionToken({
    db: getDatabase(),
    env: readServerEnv(),
    sessionToken: getCookieValue(request.headers, ADMIN_SESSION_COOKIE),
    now: new Date(),
  })
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
