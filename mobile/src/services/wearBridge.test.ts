import type { NavigationTarget } from '@/types'
import { clearMockStorage } from '@/storage/__mocks__/mmkv'
import { useAppStore } from '@/stores/appStore'
import { useWorkoutStore } from '@/stores/workoutStore'
import { makeExercise, makePlan } from '@/test-utils/factories'
import type { WatchBridgeAdapter } from '@/services/wearBridge'
import {
  listenForWatchCommands,
  mapToWatchState,
  sendWatchLifecycleEvent,
  startWatchSync,
  syncWatchRestState,
} from '@/services/wearBridge'

jest.mock('@/storage/mmkv', () => require('@/storage/__mocks__/mmkv'))

function createBridge(): WatchBridgeAdapter & {
  commands: string[]
  lifecycle: string[]
  states: string[]
  emitCommand: (command: unknown) => void
} {
  const listeners: ((commandJson: string) => void)[] = []

  return {
    commands: [],
    lifecycle: [],
    states: [],
    syncWorkoutState(stateJson: string): void {
      this.states.push(stateJson)
    },
    sendLifecycleEvent(eventJson: string): void {
      this.lifecycle.push(eventJson)
    },
    addCommandListener(listener: (commandJson: string) => void): { remove: () => void } {
      listeners.push(listener)
      return {
        remove: () => {
          const index = listeners.indexOf(listener)
          if (index >= 0) listeners.splice(index, 1)
        },
      }
    },
    emitCommand(command: unknown): void {
      const commandJson = JSON.stringify(command)
      this.commands.push(commandJson)
      listeners.forEach((listener) => listener(commandJson))
    },
  }
}

describe('wearBridge', () => {
  beforeEach(() => {
    useWorkoutStore.getState().reset()
    useAppStore.setState({
      lastWeights: {},
      lastDates: {},
      history: [],
      equipmentPhotos: {},
      lastSyncedAt: null,
      isSyncing: false,
      syncError: null,
    })
    clearMockStorage()
  })

  describe('mapToWatchState', () => {
    it('maps idle sessions to the watch idle screen', () => {
      const state = mapToWatchState(useWorkoutStore.getState(), useAppStore.getState(), 1000)

      expect(state).toEqual({
        status: 'idle',
        screen: 'idle',
        timestamp: 1000,
      })
    })

    it('maps the active exercise with progress, sets, and last known weight', () => {
      const plan = makePlan({
        exercises: [
          makeExercise('bench', { name: 'Supino Reto', sets: 4, reps: '8-10', restSeconds: 90 }),
          makeExercise('fly', { name: 'Crucifixo' }),
        ],
      })
      useWorkoutStore.getState().startWorkout(plan)
      useAppStore.getState().updateLastWeights({ bench: 72.5 })

      const state = mapToWatchState(useWorkoutStore.getState(), useAppStore.getState(), 2000)

      expect(state).toMatchObject({
        status: 'active',
        screen: 'exercise',
        planName: 'Treino A',
        exerciseId: 'bench',
        exerciseName: 'Supino Reto',
        reps: '8-10',
        currentSet: 1,
        totalSets: 4,
        lastWeight: 72.5,
        currentIndex: 1,
        totalExercises: 2,
        restSeconds: 90,
        timestamp: 2000,
      })
      expect(state.setsCompleted).toEqual([false, false, false, false])
    })

    it('uses the last completed set weight while staying on the same exercise', () => {
      const plan = makePlan({
        exercises: [makeExercise('row', { name: 'Remada', sets: 3 })],
      })
      useWorkoutStore.getState().startWorkout(plan)
      useAppStore.getState().updateLastWeights({ row: 40 })
      useWorkoutStore.getState().completeSet(45)

      const state = mapToWatchState(useWorkoutStore.getState(), useAppStore.getState(), 3000)

      expect(state).toMatchObject({
        screen: 'exercise',
        currentSet: 2,
        lastWeight: 45,
      })
      expect(state.setsCompleted).toEqual([true, false, false])
    })

    it('maps all-skipped sessions to the checkpoint screen', () => {
      const plan = makePlan({
        exercises: [
          makeExercise('leg-press', { name: 'Leg Press' }),
          makeExercise('extensora', { name: 'Extensora' }),
        ],
      })
      useWorkoutStore.getState().startWorkout(plan)
      useWorkoutStore.getState().skipExercise()
      useWorkoutStore.getState().skipExercise()

      const state = mapToWatchState(useWorkoutStore.getState(), useAppStore.getState(), 4000)

      expect(state).toMatchObject({
        status: 'active',
        screen: 'checkpoint',
        planName: 'Treino A',
        currentIndex: 2,
        totalExercises: 2,
        timestamp: 4000,
      })
      expect(state.skippedNames).toEqual(['Leg Press', 'Extensora'])
    })

    it('maps rest context with the next exercise and countdown payload', () => {
      const plan = makePlan({
        exercises: [
          makeExercise('bench', { sets: 1 }),
          makeExercise('fly', { name: 'Crucifixo' }),
        ],
      })
      useWorkoutStore.getState().startWorkout(plan)
      useWorkoutStore.getState().completeSet(70)

      const state = mapToWatchState(useWorkoutStore.getState(), useAppStore.getState(), 5000, {
        screen: 'rest',
        restSeconds: 90,
        secondsLeft: 42,
      })

      expect(state).toMatchObject({
        status: 'active',
        screen: 'rest',
        exerciseName: 'Crucifixo',
        restSeconds: 90,
        secondsLeft: 42,
        timestamp: 5000,
      })
    })
  })

  it('starts sync by sending the current state and every relevant store update', () => {
    const bridge = createBridge()
    const stop = startWatchSync(useWorkoutStore, useAppStore, bridge)

    const plan = makePlan({ exercises: [makeExercise('bench', { name: 'Supino Reto' })] })
    useWorkoutStore.getState().startWorkout(plan)

    stop()
    useWorkoutStore.getState().reset()

    expect(bridge.states).toHaveLength(2)
    expect(JSON.parse(bridge.states[0] ?? '{}')).toMatchObject({ screen: 'idle' })
    expect(JSON.parse(bridge.states[1] ?? '{}')).toMatchObject({
      screen: 'exercise',
      exerciseName: 'Supino Reto',
    })
  })

  it('sends rest countdown state on demand', () => {
    const bridge = createBridge()
    const plan = makePlan({ exercises: [makeExercise('bench')] })
    useWorkoutStore.getState().startWorkout(plan)

    syncWatchRestState(useWorkoutStore, useAppStore, bridge, 60, 23)

    expect(JSON.parse(bridge.states[0] ?? '{}')).toMatchObject({
      screen: 'rest',
      restSeconds: 60,
      secondsLeft: 23,
    })
  })

  it('sends lifecycle events through the bridge', () => {
    const bridge = createBridge()

    sendWatchLifecycleEvent(bridge, { event: 'workoutStarted', planName: 'Treino A' })

    expect(JSON.parse(bridge.lifecycle[0] ?? '{}')).toEqual({
      event: 'workoutStarted',
      planName: 'Treino A',
    })
  })

  it('handles complete-set commands with the current exercise last weight', () => {
    const bridge = createBridge()
    const targets: NavigationTarget[] = []
    const plan = makePlan({
      exercises: [makeExercise('bench', { name: 'Supino Reto', sets: 2, restSeconds: 75 })],
    })
    useWorkoutStore.getState().startWorkout(plan)
    useAppStore.getState().updateLastWeights({ bench: 80 })

    const subscription = listenForWatchCommands(useWorkoutStore, useAppStore, bridge, (target) => {
      targets.push(target)
    })

    bridge.emitCommand({ action: 'completeSet' })

    subscription.remove()
    expect(useWorkoutStore.getState().currentSet).toBe(2)
    expect(useWorkoutStore.getState().currentSets[0]?.weight).toBe(80)
    expect(targets).toEqual([{ target: 'rest', restSeconds: 75 }])
  })

  it('handles skip and return-to-skipped commands', () => {
    const bridge = createBridge()
    const targets: NavigationTarget[] = []
    const plan = makePlan({
      exercises: [makeExercise('bench'), makeExercise('row')],
    })
    useWorkoutStore.getState().startWorkout(plan)

    const subscription = listenForWatchCommands(useWorkoutStore, useAppStore, bridge, (target) => {
      targets.push(target)
    })

    bridge.emitCommand({ action: 'skip' })
    bridge.emitCommand({ action: 'returnToSkipped', exerciseId: 'bench' })

    subscription.remove()
    expect(useWorkoutStore.getState().skippedIds).toEqual([])
    expect(targets).toEqual([{ target: 'next' }, { target: 'next' }])
  })
})
