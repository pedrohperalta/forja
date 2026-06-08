import * as Crypto from 'expo-crypto'
import { usePlanStore } from '@/stores/planStore'
import { useAppStore } from '@/stores/appStore'
import { useAuthStore } from '@/stores/authStore'
import { restoreEquipmentPhotosFromCloud } from '@/hooks/useEquipmentPhoto'
import { rebuildLastWeights } from '@/utils/rebuildLastWeights'
import type { Plan, WorkoutId, WorkoutSession } from '@/types'
import { createMobileApiClient, type MobileApiClient } from './mobileApiClient'

/** In-memory lock to prevent concurrent syncs. */
let isSyncing = false

const MAX_PULL_PAGES = 20

function createSyncApiClient(): MobileApiClient {
  return createMobileApiClient({
    getTokens: () => useAuthStore.getState().remoteTokens,
    setTokens: (tokens) => useAuthStore.getState().setRemoteTokens(tokens),
    clearTokens: () => useAuthStore.getState().clearRemoteTokens(),
  })
}

async function pushData(client: MobileApiClient): Promise<void> {
  const { history } = useAppStore.getState()

  const unsyncedSessions = history.filter((s) => s.syncStatus !== 'synced')
  if (unsyncedSessions.length === 0) {
    return
  }

  const response = await client.pushSync({
    workoutSessions: unsyncedSessions.map((session) => ({
      id: session.id,
      data: toRemoteWorkoutSession(session),
      updatedAt: session.updatedAt,
      deletedAt: null,
    })),
    clientMutationId: Crypto.randomUUID(),
  })

  useAppStore
    .getState()
    .markSessionsSynced(response.acceptedWorkoutSessionIds as WorkoutId[])
  mergePulledWorkoutSessions(response.currentWorkoutSessions.map((change) => change.data))
}

async function pullData(client: MobileApiClient): Promise<void> {
  let cursor: string | null = null
  const seenCursors = new Set<string>()

  for (let page = 0; page < MAX_PULL_PAGES; page++) {
    const response = await client.pullSync(cursor)

    mergePulledPlans(response.plans.map((change) => change.data))
    archiveDeletedPlans(response.deletedPlanIds)
    mergePulledWorkoutSessions(response.workoutSessions.map((change) => change.data))

    if (!response.hasMore) {
      return
    }

    if (seenCursors.has(response.cursor)) {
      throw new Error('Paginação de sincronização inválida')
    }

    seenCursors.add(response.cursor)
    cursor = response.cursor
  }

  throw new Error('Limite de páginas de sincronização excedido')
}

/**
 * Pushes local unsynced data to Supabase, then pulls remote data.
 * Push-first ensures local changes are preserved on conflict.
 * No-op if not authenticated or a sync is already in progress.
 */
export async function sync(): Promise<void> {
  if (isSyncing) return
  const authState = useAuthStore.getState()
  if (!authState.user || !authState.remoteTokens) return

  isSyncing = true
  useAppStore.getState().setSyncState(true, null)

  try {
    const client = createSyncApiClient()
    await pushData(client)
    await pullData(client)
    // Best-effort photo restore — never fail sync over photos
    await restoreEquipmentPhotosFromCloud().catch(() => {})
    // Recover lastWeights that never left the device — derive from synced history
    const plans = usePlanStore.getState().plans
    const history = useAppStore.getState().history
    const current = useAppStore.getState().lastWeights
    const derived = rebuildLastWeights(plans, history)
    const missing: Record<string, number> = {}
    for (const [id, w] of Object.entries(derived)) {
      if (current[id] === undefined) missing[id] = w
    }
    if (Object.keys(missing).length > 0) {
      useAppStore.getState().updateLastWeights(missing)
    }
    useAppStore.getState().setLastSyncedAt(new Date().toISOString())
    useAppStore.getState().setSyncState(false, null)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao sincronizar'
    useAppStore.getState().setSyncState(false, message)
  } finally {
    isSyncing = false
  }
}

/**
 * Deletes a session from the server. Called after local deletion when authenticated.
 * Errors are silently ignored — local deletion always succeeds.
 */
export async function deleteSessionFromServer(sessionId: string): Promise<void> {
  const authState = useAuthStore.getState()
  if (!authState.user || !authState.remoteTokens) return

  await createSyncApiClient().deleteWorkoutSession(sessionId)
}

function mergePulledPlans(plans: Plan[]): void {
  usePlanStore.getState().mergeFromServer(
    plans.map((plan) => ({
      ...plan,
      syncStatus: 'synced' as const,
    })),
  )
}

function archiveDeletedPlans(planIds: string[]): void {
  if (planIds.length === 0) {
    return
  }

  const idSet = new Set(planIds)
  const now = new Date().toISOString()

  usePlanStore.setState((state) => ({
    plans: state.plans.map((plan) =>
      idSet.has(plan.id)
        ? {
            ...plan,
            archived: true,
            syncStatus: 'synced' as const,
            updatedAt: now,
          }
        : plan,
    ),
  }))
}

function mergePulledWorkoutSessions(sessions: WorkoutSession[]): void {
  if (sessions.length === 0) {
    return
  }

  useAppStore
    .getState()
    .mergeSessionsFromServer(sessions.map((session) => ({ ...session, syncStatus: 'synced' })))
}

function toRemoteWorkoutSession(session: WorkoutSession): WorkoutSession {
  return {
    ...session,
    date: normalizeDateTime(session.date),
  }
}

function normalizeDateTime(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value}T00:00:00.000Z`
  }

  return value
}
