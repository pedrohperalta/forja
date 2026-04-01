import { supabase } from '@/lib/supabase'
import { usePlanStore } from '@/stores/planStore'
import { useAppStore } from '@/stores/appStore'
import { useAuthStore } from '@/stores/authStore'
import type { Plan, WorkoutSession } from '@/types'

/** In-memory lock to prevent concurrent syncs. */
let isSyncing = false

async function pushData(userId: string): Promise<void> {
  const { plans } = usePlanStore.getState()
  const { history } = useAppStore.getState()

  // Push plans not yet confirmed on server
  const unsyncedPlans = plans.filter((p) => p.syncStatus !== 'synced')
  if (unsyncedPlans.length > 0) {
    const rows = unsyncedPlans.map((p) => ({
      id: p.id,
      user_id: userId,
      data: p,
      updated_at: p.updatedAt,
      deleted_at: p.archived === true ? new Date().toISOString() : null,
    }))
    const { error } = await supabase.from('plans').upsert(rows)
    if (!error) {
      usePlanStore.getState().markPlansSynced(unsyncedPlans.map((p) => p.id))
    }
  }

  // Push sessions not yet confirmed on server
  const unsyncedSessions = history.filter((s) => s.syncStatus !== 'synced')
  if (unsyncedSessions.length > 0) {
    const rows = unsyncedSessions.map((s) => ({
      id: s.id,
      user_id: userId,
      data: s,
      updated_at: s.updatedAt,
    }))
    const { error } = await supabase.from('workout_sessions').upsert(rows)
    if (!error) {
      useAppStore.getState().markSessionsSynced(unsyncedSessions.map((s) => s.id))
    }
  }
}

async function pullData(userId: string): Promise<void> {
  // Pull plans from server
  const { data: planRows, error: planError } = await supabase
    .from('plans')
    .select('data')
    .eq('user_id', userId)

  if (!planError && planRows) {
    const serverPlans: Plan[] = planRows.map((row) => ({
      ...(row.data as Plan),
      syncStatus: 'synced' as const,
    }))
    usePlanStore.getState().mergeFromServer(serverPlans)
  }

  // Pull sessions from server
  const { data: sessionRows, error: sessionError } = await supabase
    .from('workout_sessions')
    .select('data')
    .eq('user_id', userId)

  if (!sessionError && sessionRows) {
    const serverSessions: WorkoutSession[] = sessionRows.map((row) => ({
      ...(row.data as WorkoutSession),
      syncStatus: 'synced' as const,
    }))
    useAppStore.getState().mergeSessionsFromServer(serverSessions)
  }
}

/**
 * Pushes local unsynced data to Supabase, then pulls remote data.
 * Push-first ensures local changes are preserved on conflict.
 * No-op if not authenticated or a sync is already in progress.
 */
export async function sync(): Promise<void> {
  if (isSyncing) return
  const userId = useAuthStore.getState().user?.id
  if (!userId) return

  isSyncing = true
  useAppStore.getState().setSyncState(true, null)

  try {
    await pushData(userId)
    await pullData(userId)
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
  const userId = useAuthStore.getState().user?.id
  if (!userId) return
  await supabase.from('workout_sessions').delete().eq('id', sessionId).eq('user_id', userId)
}
