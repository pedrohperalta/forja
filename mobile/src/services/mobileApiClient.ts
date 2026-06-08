import type { Plan, WorkoutSession } from '@/types'
import type { RemoteTokens } from '@/stores/authStore'

const DEFAULT_API_URL = 'http://localhost:3000'

export type SyncPushWorkoutSession = {
  id: string
  data: WorkoutSession
  updatedAt: string
  deletedAt: string | null
}

export type SyncPushRequest = {
  workoutSessions: SyncPushWorkoutSession[]
  clientMutationId: string
}

export type WorkoutSessionChange = {
  id: string
  data: WorkoutSession
  updatedAt: string
}

export type SyncPushResponse = {
  ok: true
  acceptedWorkoutSessionIds: string[]
  skippedWorkoutSessionIds: string[]
  currentWorkoutSessions: WorkoutSessionChange[]
}

export type PublishedPlanChange = {
  id: string
  revisionId: string
  data: Plan
  updatedAt: string
}

export type SyncPullResponse = {
  cursor: string
  hasMore: boolean
  plans: PublishedPlanChange[]
  deletedPlanIds: string[]
  workoutSessions: WorkoutSessionChange[]
  deletedWorkoutSessionIds: string[]
}

type MobileAuthRefreshResponse = {
  accessToken: string
  refreshToken: string
  expiresAt: string
}

type ApiErrorBody = {
  error?: {
    code?: string
    message?: string
  }
}

type MobileApiClientInput = {
  getTokens: () => RemoteTokens | null
  setTokens: (tokens: RemoteTokens) => void
  clearTokens: () => void
  fetchImpl?: typeof fetch
  baseUrl?: string
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'DELETE'
  body?: unknown
  retryOnUnauthorized?: boolean
}

export class MobileApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message)
  }
}

export type MobileApiClient = ReturnType<typeof createMobileApiClient>

export function createMobileApiClient(input: MobileApiClientInput): {
  pushSync(request: SyncPushRequest): Promise<SyncPushResponse>
  pullSync(cursor: string | null): Promise<SyncPullResponse>
  deleteWorkoutSession(sessionId: string): Promise<{ ok: true }>
} {
  const fetchImpl = input.fetchImpl ?? fetch
  const baseUrl = normalizeBaseUrl(input.baseUrl ?? process.env.EXPO_PUBLIC_FORJA_API_URL)

  async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const tokens = input.getTokens()

    if (!tokens) {
      throw new MobileApiError('Sessão expirada. Entre novamente.', 401, 'unauthenticated')
    }

    const response = await fetchImpl(`${baseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    })

    if (response.status === 401 && options.retryOnUnauthorized !== false) {
      const refreshed = await refreshTokens(tokens.refreshToken)
      input.setTokens(refreshed)

      return request(path, { ...options, retryOnUnauthorized: false })
    }

    return readJsonResponse<T>(response)
  }

  async function refreshTokens(refreshToken: string): Promise<RemoteTokens> {
    const response = await fetchImpl(`${baseUrl}/api/mobile/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })

    if (response.status === 401) {
      input.clearTokens()
    }

    return readJsonResponse<MobileAuthRefreshResponse>(response)
  }

  return {
    pushSync(requestBody): Promise<SyncPushResponse> {
      return request('/api/mobile/v1/sync/push', {
        method: 'POST',
        body: requestBody,
      })
    },

    pullSync(cursor): Promise<SyncPullResponse> {
      const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''

      return request(`/api/mobile/v1/sync/pull${query}`)
    },

    deleteWorkoutSession(sessionId): Promise<{ ok: true }> {
      return request(`/api/mobile/v1/workout-sessions/${encodeURIComponent(sessionId)}`, {
        method: 'DELETE',
      })
    },
  }
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as ApiErrorBody | T

  if (!response.ok) {
    const errorBody = body as ApiErrorBody

    throw new MobileApiError(
      errorBody.error?.message ?? 'Erro ao sincronizar',
      response.status,
      errorBody.error?.code,
    )
  }

  return body as T
}

function normalizeBaseUrl(value: string | undefined): string {
  return (value ?? DEFAULT_API_URL).replace(/\/+$/, '')
}
