import { ADMIN_SESSION_COOKIE, getAdminUserFromSessionToken } from '@/server/auth/adminAuth'
import { getDatabase } from '@/server/db/client'
import { readServerEnv } from '@/server/env'
import { errorResponse, jsonWithRequestId, requestId } from '@/server/http/responses'
import {
  listMobileBuildJobs,
  startMobileBuildJob,
  type MobileBuildArtifactType,
} from '@/server/mobileBuilds'

export const runtime = 'nodejs'

export async function GET(request: Request): Promise<Response> {
  const id = requestId(request.headers)
  const admin = await getAdmin(request)
  if (!admin) {
    return errorResponse('unauthenticated', 'Unauthenticated', 401, id)
  }

  return jsonWithRequestId({ builds: await listMobileBuildJobs() }, 200, id)
}

export async function POST(request: Request): Promise<Response> {
  const id = requestId(request.headers)
  const admin = await getAdmin(request)
  if (!admin) {
    return redirectOrError(request, '/admin/login', 'Unauthenticated', 401, id)
  }

  const type = await readArtifactType(request)
  if (!type) {
    return redirectOrError(
      request,
      '/admin/mobile-builds?error=invalid_type',
      'Invalid build type',
      400,
      id,
    )
  }

  try {
    const build = await startMobileBuildJob(type)
    if (wantsHtmlResponse(request)) {
      return redirectToPath(`/admin/mobile-builds?build=${build.id}`)
    }

    return jsonWithRequestId({ build }, 202, id)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Build failed to start'
    return redirectOrError(
      request,
      `/admin/mobile-builds?error=${encodeURIComponent(message)}`,
      message,
      409,
      id,
    )
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

async function readArtifactType(request: Request): Promise<MobileBuildArtifactType | null> {
  const contentType = request.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    const body = (await request.json().catch(() => null)) as { type?: unknown } | null
    return parseArtifactType(body?.type)
  }

  const formData = await request.formData().catch(() => null)
  return parseArtifactType(formData?.get('type'))
}

function parseArtifactType(value: unknown): MobileBuildArtifactType | null {
  return value === 'apk' || value === 'aab' ? value : null
}

function redirectOrError(
  request: Request,
  path: string,
  message: string,
  status: number,
  id: string,
): Response {
  if (wantsHtmlResponse(request)) {
    return redirectToPath(path)
  }

  return errorResponse(status === 401 ? 'unauthenticated' : 'invalid_request', message, status, id)
}

function redirectToPath(path: string): Response {
  return new Response(null, {
    status: 303,
    headers: {
      location: path,
    },
  })
}

function wantsHtmlResponse(request: Request): boolean {
  return (request.headers.get('accept') ?? '').includes('text/html')
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
