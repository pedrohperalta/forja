import type { Plan, PlanId, WorkoutId, WorkoutSession } from '@/types'
import { clearMockStorage } from '@/storage/__mocks__/mmkv'
import { useAppStore } from '@/stores/appStore'
import { useAuthStore } from '@/stores/authStore'
import { usePlanStore } from '@/stores/planStore'
import { deleteSessionFromServer, sync } from './syncService'

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      signInWithOAuth: jest.fn(),
      exchangeCodeForSession: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(() => {
      throw new Error('syncService must not call supabase.from')
    }),
  },
}))
jest.mock('@/hooks/useEquipmentPhoto', () => ({
  restoreEquipmentPhotosFromCloud: jest.fn().mockResolvedValue(undefined),
}))

const fetchMock = jest.fn()

const user = {
  id: '0a9d699f-c75f-4a55-a924-79a607f2f420',
  email: 'user@example.com',
} as never

describe('syncService', () => {
  beforeEach(() => {
    clearMockStorage()
    fetchMock.mockReset()
    global.fetch = fetchMock
    process.env.EXPO_PUBLIC_FORJA_API_URL = 'https://forja.example.com'

    usePlanStore.setState({ plans: [], nextLabel: 'A' })
    useAppStore.setState({
      lastWeights: {},
      lastDates: {},
      history: [],
      equipmentPhotos: {},
      lastSyncedAt: null,
      isSyncing: false,
      syncError: null,
    })
    useAuthStore.setState({
      user: null,
      session: null,
      remoteTokens: null,
      isLoading: false,
    })
  })

  it('no-ops when unauthenticated', async () => {
    await sync()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(useAppStore.getState().lastSyncedAt).toBeNull()
  })

  it('pushes unsynced workout sessions and marks them synced', async () => {
    authenticate()
    useAppStore.getState().saveWorkout(makeSession())
    fetchMock
      .mockResolvedValueOnce(jsonResponse(pushResponse(['session_1'])))
      .mockResolvedValueOnce(jsonResponse(pullResponse()))

    await sync()

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://forja.example.com/api/mobile/v1/sync/push',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
        }),
      }),
    )
    const pushBody = JSON.parse(fetchMock.mock.calls[0]?.[1].body) as {
      workoutSessions: { id: string }[]
    }
    expect(pushBody.workoutSessions.map((session) => session.id)).toEqual([
      'session_1',
    ])
    expect(useAppStore.getState().history[0]?.syncStatus).toBe('synced')
  })

  it('pulls published plans from the Next API', async () => {
    authenticate()
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        pullResponse({
          plans: [
            {
              id: 'plan_a',
              revisionId: 'revision_1',
              data: makePlan(),
              updatedAt: '2026-05-18T12:00:00.000Z',
            },
          ],
        }),
      )
    )

    await sync()

    expect(usePlanStore.getState().plans).toEqual([
      expect.objectContaining({
        id: 'plan_a',
        name: 'Treino A',
        syncStatus: 'synced',
      }),
    ])
  })

  it('follows paginated pull responses while hasMore is true', async () => {
    authenticate()
    fetchMock
      .mockResolvedValueOnce(jsonResponse(pullResponse({ cursor: 'cursor-1', hasMore: true })))
      .mockResolvedValueOnce(
        jsonResponse(
          pullResponse({
            cursor: 'cursor-2',
            plans: [
              {
                id: 'plan_b',
                revisionId: 'revision_2',
                data: makePlan({ id: 'plan_b' as PlanId, label: 'B', name: 'Treino B' }),
                updatedAt: '2026-05-18T13:00:00.000Z',
              },
            ],
          }),
        ),
      )

    await sync()

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://forja.example.com/api/mobile/v1/sync/pull',
      expect.anything(),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://forja.example.com/api/mobile/v1/sync/pull?cursor=cursor-1',
      expect.anything(),
    )
    expect(usePlanStore.getState().plans[0]?.name).toBe('Treino B')
  })

  it('stops and reports an error when pull pagination loops', async () => {
    authenticate()
    fetchMock
      .mockResolvedValueOnce(jsonResponse(pullResponse({ cursor: 'loop', hasMore: true })))
      .mockResolvedValueOnce(jsonResponse(pullResponse({ cursor: 'loop', hasMore: true })))

    await sync()

    expect(useAppStore.getState().syncError).toBe('Paginação de sincronização inválida')
  })

  it('handles server tombstones by archiving local plans', async () => {
    authenticate()
    usePlanStore.setState({ plans: [makePlan()], nextLabel: 'B' })
    fetchMock.mockResolvedValueOnce(jsonResponse(pullResponse({ deletedPlanIds: ['plan_a'] })))

    await sync()

    expect(usePlanStore.getState().plans[0]).toEqual(
      expect.objectContaining({ id: 'plan_a', archived: true, syncStatus: 'synced' }),
    )
  })

  it('records last synced timestamp on success', async () => {
    authenticate()
    fetchMock.mockResolvedValueOnce(jsonResponse(pullResponse()))

    await sync()

    expect(useAppStore.getState().lastSyncedAt).toEqual(expect.any(String))
    expect(useAppStore.getState().syncError).toBeNull()
  })

  it('stores a structured error message on API failure', async () => {
    authenticate()
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { error: { code: 'validation_error', message: 'Sessão inválida' } },
        422,
      ),
    )

    await sync()

    expect(useAppStore.getState().syncError).toBe('Sessão inválida')
  })

  it('clears remote tokens when refresh fails without deleting local workout data', async () => {
    authenticate()
    useAppStore.getState().saveWorkout(makeSession())
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: { message: 'Expired' } }, 401))
      .mockResolvedValueOnce(jsonResponse({ error: { message: 'Invalid refresh' } }, 401))

    await sync()

    expect(useAuthStore.getState().remoteTokens).toBeNull()
    expect(useAppStore.getState().history).toHaveLength(1)
  })

  it('deletes sessions through the Next API when authenticated', async () => {
    authenticate()
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }))

    await deleteSessionFromServer('session_1')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://forja.example.com/api/mobile/v1/workout-sessions/session_1',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})

function authenticate(): void {
  useAuthStore.setState({
    user,
    remoteTokens: {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresAt: '2026-05-18T12:15:00.000Z',
    },
  })
}

function makePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    id: 'plan_a' as PlanId,
    label: 'A',
    name: 'Treino A',
    focus: 'Peito / Ombros',
    exercises: [],
    archived: false,
    syncStatus: 'synced',
    createdAt: '2026-05-18T12:00:00.000Z',
    updatedAt: '2026-05-18T12:00:00.000Z',
    ...overrides,
  }
}

function makeSession(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    id: 'session_1' as WorkoutId,
    planId: 'plan_a' as PlanId,
    planName: 'Treino A',
    planLabel: 'A',
    focus: 'Peito / Ombros',
    date: '2026-05-18T12:00:00.000Z',
    durationMinutes: 42,
    exercises: [{ name: 'Supino Reto', sets: 3, weight: 80 }],
    syncStatus: 'local',
    version: 1,
    createdAt: '2026-05-18T12:00:00.000Z',
    updatedAt: '2026-05-18T12:00:00.000Z',
    ...overrides,
  }
}

function pushResponse(acceptedWorkoutSessionIds: string[]): unknown {
  return {
    ok: true,
    acceptedWorkoutSessionIds,
    skippedWorkoutSessionIds: [],
    currentWorkoutSessions: [],
  }
}

function pullResponse(
  overrides: Partial<{
    cursor: string
    hasMore: boolean
    plans: unknown[]
    deletedPlanIds: string[]
    workoutSessions: unknown[]
    deletedWorkoutSessionIds: string[]
  }> = {},
): unknown {
  return {
    cursor: 'cursor-final',
    hasMore: false,
    plans: [],
    deletedPlanIds: [],
    workoutSessions: [],
    deletedWorkoutSessionIds: [],
    ...overrides,
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}
