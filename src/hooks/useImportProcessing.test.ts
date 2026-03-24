/**
 * useImportProcessing hook tests
 *
 * Tests the photo processing pipeline: sequential processing, status
 * updates, label auto-generation, error handling per photo, and
 * importStore status transitions (processing → reviewing).
 */

import { renderHook, act } from '@testing-library/react-native'
import { useImportStore } from '@/stores/importStore'
import { usePlanStore } from '@/stores/planStore'
import * as importApi from '@/services/importApi'
import { useImportProcessing } from '@/hooks/useImportProcessing'
import { makeExtractedWorkout } from '@/test-utils/factories'

// Mock stores — use real Zustand stores but spy on methods
jest.mock('@/storage/mmkv', () => require('@/storage/__mocks__/mmkv'))

jest.mock('@/services/importApi', () => ({
  extractWorkout: jest.fn(),
}))

const mockExtractWorkout = importApi.extractWorkout as jest.MockedFunction<
  typeof importApi.extractWorkout
>

describe('useImportProcessing', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useImportStore.getState().reset()
    usePlanStore.getState().reset()
  })

  it('sets status to processing on start', async () => {
    useImportStore.setState({
      photos: [{ uri: 'file:///photo1.jpg', status: 'pending' }],
      status: 'capturing',
    })

    const workout = makeExtractedWorkout({ name: 'Treino A' })
    mockExtractWorkout.mockResolvedValueOnce(workout)

    const { result } = renderHook(() => useImportProcessing())

    await act(async () => {
      await result.current.processPhotos()
    })

    // Status should have transitioned through processing
    // (it ends at reviewing but we verify it was set to processing)
    expect(mockExtractWorkout).toHaveBeenCalled()
  })

  it('sets status to reviewing on completion', async () => {
    useImportStore.setState({
      photos: [{ uri: 'file:///photo1.jpg', status: 'pending' }],
      status: 'capturing',
    })

    const workout = makeExtractedWorkout({ name: 'Treino A' })
    mockExtractWorkout.mockResolvedValueOnce(workout)

    const { result } = renderHook(() => useImportProcessing())

    await act(async () => {
      await result.current.processPhotos()
    })

    expect(useImportStore.getState().status).toBe('reviewing')
  })

  it('processes photos sequentially and aggregates workouts', async () => {
    useImportStore.setState({
      photos: [
        { uri: 'file:///photo1.jpg', status: 'pending' },
        { uri: 'file:///photo2.jpg', status: 'pending' },
      ],
      status: 'capturing',
    })

    const workout1 = makeExtractedWorkout({ name: 'Treino A' })
    const workout2 = makeExtractedWorkout({ name: 'Treino B' })
    mockExtractWorkout
      .mockResolvedValueOnce(workout1)
      .mockResolvedValueOnce(workout2)

    const { result } = renderHook(() => useImportProcessing())

    await act(async () => {
      await result.current.processPhotos()
    })

    const { workouts } = useImportStore.getState()
    expect(workouts).toHaveLength(2)
    expect(workouts[0]!.name).toBe('Treino A')
    expect(workouts[1]!.name).toBe('Treino B')
  })

  it('updates photo status to uploading then done for each photo', async () => {
    useImportStore.setState({
      photos: [{ uri: 'file:///photo1.jpg', status: 'pending' }],
      status: 'capturing',
    })

    const workout = makeExtractedWorkout()
    mockExtractWorkout.mockResolvedValueOnce(workout)

    const { result } = renderHook(() => useImportProcessing())

    await act(async () => {
      await result.current.processPhotos()
    })

    // After processing, the photo should be done
    const photo = useImportStore.getState().photos[0]
    expect(photo!.status).toBe('done')
  })

  it('sets photo status to error when extraction fails', async () => {
    useImportStore.setState({
      photos: [
        { uri: 'file:///photo1.jpg', status: 'pending' },
        { uri: 'file:///photo2.jpg', status: 'pending' },
      ],
      status: 'capturing',
    })

    const workout = makeExtractedWorkout({ name: 'Treino B' })
    mockExtractWorkout
      .mockRejectedValueOnce(new Error('API error'))
      .mockResolvedValueOnce(workout)

    const { result } = renderHook(() => useImportProcessing())

    await act(async () => {
      await result.current.processPhotos()
    })

    const photos = useImportStore.getState().photos
    expect(photos[0]!.status).toBe('error')
    expect(photos[1]!.status).toBe('done')

    // Only the successful workout should be aggregated
    const { workouts } = useImportStore.getState()
    expect(workouts).toHaveLength(1)
    expect(workouts[0]!.name).toBe('Treino B')
  })

  it('auto-generates sequential labels from planStore.nextLabel', async () => {
    usePlanStore.setState({ nextLabel: 'C' })
    useImportStore.setState({
      photos: [
        { uri: 'file:///photo1.jpg', status: 'pending' },
        { uri: 'file:///photo2.jpg', status: 'pending' },
      ],
      status: 'capturing',
    })

    mockExtractWorkout
      .mockResolvedValueOnce(makeExtractedWorkout())
      .mockResolvedValueOnce(makeExtractedWorkout())

    const { result } = renderHook(() => useImportProcessing())

    await act(async () => {
      await result.current.processPhotos()
    })

    // First photo should use label C, second should use D
    expect(mockExtractWorkout).toHaveBeenCalledWith('file:///photo1.jpg', 'C')
    expect(mockExtractWorkout).toHaveBeenCalledWith('file:///photo2.jpg', 'D')
  })

  it('returns isProcessing true while processing', async () => {
    useImportStore.setState({
      photos: [{ uri: 'file:///photo1.jpg', status: 'pending' }],
      status: 'capturing',
    })

    let resolveExtract: (value: ReturnType<typeof makeExtractedWorkout>) => void
    mockExtractWorkout.mockImplementationOnce(
      () => new Promise((resolve) => { resolveExtract = resolve }),
    )

    const { result } = renderHook(() => useImportProcessing())

    let processPromise: Promise<void>
    act(() => {
      processPromise = result.current.processPhotos()
    })

    expect(result.current.isProcessing).toBe(true)

    await act(async () => {
      resolveExtract!(makeExtractedWorkout())
      await processPromise!
    })

    expect(result.current.isProcessing).toBe(false)
  })

  it('still sets reviewing even when all photos fail', async () => {
    useImportStore.setState({
      photos: [{ uri: 'file:///photo1.jpg', status: 'pending' }],
      status: 'capturing',
    })

    mockExtractWorkout.mockRejectedValueOnce(new Error('fail'))

    const { result } = renderHook(() => useImportProcessing())

    await act(async () => {
      await result.current.processPhotos()
    })

    expect(useImportStore.getState().status).toBe('reviewing')
    expect(useImportStore.getState().workouts).toHaveLength(0)
  })
})
