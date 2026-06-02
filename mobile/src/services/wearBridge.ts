import type { StoreApi, UseBoundStore } from 'zustand'
import type { AppState } from '@/stores/appStore'
import type { WorkoutState } from '@/stores/workoutStore'
import type { ExerciseId, NavigationTarget } from '@/types'
import { getCurrentExercise } from '@/utils/getCurrentExercise'

type RestContext = {
  screen: 'rest'
  restSeconds: number
  secondsLeft: number
}

type WatchCommand =
  | { action: 'completeSet' }
  | { action: 'skip' }
  | { action: 'returnToSkipped'; exerciseId: ExerciseId }

type WatchLifecycleEvent = {
  event: string
  planName?: string
}

export type WatchBridgeAdapter = {
  syncWorkoutState: (stateJson: string) => void
  sendLifecycleEvent: (eventJson: string) => void
  addCommandListener: (listener: (commandJson: string) => void) => { remove: () => void }
}

type WorkoutStore = UseBoundStore<StoreApi<WorkoutState>>
type AppStore = UseBoundStore<StoreApi<AppState>>

function getLastKnownWeight(workoutState: WorkoutState, appState: AppState): number {
  const currentExercise = getCurrentExercise(workoutState.queue, workoutState.skippedIds)
  if (!currentExercise) return 0

  const currentSet = workoutState.currentSets.at(-1)
  return currentSet?.weight ?? appState.lastWeights[currentExercise.id] ?? 0
}

export function mapToWatchState(
  workoutState: WorkoutState,
  appState: AppState,
  timestamp: number,
  restContext?: RestContext,
): Record<string, unknown> {
  if (workoutState.status !== 'active' || !workoutState.activePlan) {
    return {
      status: 'idle',
      screen: 'idle',
      timestamp,
    }
  }

  const currentExercise = getCurrentExercise(workoutState.queue, workoutState.skippedIds)

  if (restContext) {
    return {
      status: 'active',
      screen: 'rest',
      planName: workoutState.activePlan.name,
      exerciseName: currentExercise?.name,
      restSeconds: restContext.restSeconds,
      secondsLeft: restContext.secondsLeft,
      timestamp,
    }
  }

  if (!currentExercise) {
    const skippedNames = workoutState.queue
      .filter((exercise) => workoutState.skippedIds.includes(exercise.id))
      .map((exercise) => exercise.name)

    return {
      status: 'active',
      screen: 'checkpoint',
      planName: workoutState.activePlan.name,
      currentIndex: workoutState.queue.length,
      totalExercises: workoutState.queue.length,
      skippedNames,
      timestamp,
    }
  }

  const currentIndex = workoutState.activePlan.exercises.findIndex(
    (exercise) => exercise.id === currentExercise.id,
  )
  const lastSet = workoutState.currentSets.at(-1)

  return {
    status: 'active',
    screen: 'exercise',
    planName: workoutState.activePlan.name,
    exerciseId: currentExercise.id,
    exerciseName: currentExercise.name,
    reps: currentExercise.reps,
    currentSet: workoutState.currentSet,
    totalSets: currentExercise.sets,
    setsCompleted: Array.from({ length: currentExercise.sets }, (_, index) => {
      return index < workoutState.currentSets.length
    }),
    lastWeight: lastSet?.weight ?? appState.lastWeights[currentExercise.id],
    currentIndex: currentIndex >= 0 ? currentIndex + 1 : 1,
    totalExercises: workoutState.activePlan.exercises.length,
    restSeconds: currentExercise.restSeconds,
    timestamp,
  }
}

export function startWatchSync(
  workoutStore: WorkoutStore,
  appStore: AppStore,
  bridge: WatchBridgeAdapter,
): () => void {
  const sync = (): void => {
    bridge.syncWorkoutState(
      JSON.stringify(mapToWatchState(workoutStore.getState(), appStore.getState(), Date.now())),
    )
  }

  sync()
  const unsubscribeWorkout = workoutStore.subscribe(sync)
  const unsubscribeApp = appStore.subscribe(sync)

  return () => {
    unsubscribeWorkout()
    unsubscribeApp()
  }
}

export function syncWatchRestState(
  workoutStore: WorkoutStore,
  appStore: AppStore,
  bridge: WatchBridgeAdapter,
  restSeconds: number,
  secondsLeft: number,
): void {
  bridge.syncWorkoutState(
    JSON.stringify(
      mapToWatchState(workoutStore.getState(), appStore.getState(), Date.now(), {
        screen: 'rest',
        restSeconds,
        secondsLeft,
      }),
    ),
  )
}

export function sendWatchLifecycleEvent(
  bridge: WatchBridgeAdapter,
  event: WatchLifecycleEvent,
): void {
  bridge.sendLifecycleEvent(JSON.stringify(event))
}

export function listenForWatchCommands(
  workoutStore: WorkoutStore,
  appStore: AppStore,
  bridge: WatchBridgeAdapter,
  navigate: (target: NavigationTarget) => void,
): { remove: () => void } {
  return bridge.addCommandListener((commandJson) => {
    const command = JSON.parse(commandJson) as WatchCommand

    if (command.action === 'completeSet') {
      navigate(
        workoutStore
          .getState()
          .completeSet(getLastKnownWeight(workoutStore.getState(), appStore.getState())),
      )
      return
    }

    if (command.action === 'skip') {
      navigate(workoutStore.getState().skipExercise())
      return
    }

    if (command.action === 'returnToSkipped') {
      workoutStore.getState().returnToSkipped(command.exerciseId)
      navigate({ target: 'next' })
    }
  })
}
