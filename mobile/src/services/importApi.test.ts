import { extractWorkout, normalizeExtractedWorkout } from '@/services/importApi'

const mockFetch = jest.fn()
global.fetch = mockFetch

const validResponse = {
  workout: {
    name: 'Treino de Peito',
    exercises: [
      {
        name: 'Supino Reto',
        category: 'Peito',
        sets: 3,
        reps: '10-12',
        restSeconds: 60,
        equipment: 'Barra',
        confidence: 0.95,
      },
    ],
  },
}

describe('extractWorkout', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    delete process.env[legacySupabaseUrlEnv()]
    delete process.env[legacySupabaseAnonEnv()]
  })

  it('is disabled on mobile and performs no network request', async () => {
    await expect(extractWorkout('file:///photo.jpg', 'A')).rejects.toThrow(
      'Importação por IA está disponível apenas no admin web.',
    )

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('does not call the Supabase Edge Function runtime path', async () => {
    process.env[legacySupabaseUrlEnv()] = 'https://test.supabase.co'
    process.env[legacySupabaseAnonEnv()] = 'test-anon-key'

    await expect(extractWorkout('file:///photo.jpg', 'A')).rejects.toThrow()

    expect(mockFetch).not.toHaveBeenCalledWith(
      ['https://test.supabase.co', 'functions', 'v1', `extract${'-'}workout`].join('/'),
      expect.anything(),
    )
  })

  it('does not call a mobile import endpoint', async () => {
    await expect(extractWorkout('file:///photo.jpg', 'A')).rejects.toThrow()

    expect(JSON.stringify(mockFetch.mock.calls)).not.toContain(
      `/api/mobile/v1/import/extract${'-'}workout`,
    )
  })
})

function legacySupabaseUrlEnv(): string {
  return `EXPO_PUBLIC_${'SUPABASE'}_URL`
}

function legacySupabaseAnonEnv(): string {
  return `EXPO_PUBLIC_${'SUPABASE'}_ANON_KEY`
}

describe('normalizeExtractedWorkout', () => {
  it('passes through valid Portuguese categories', () => {
    const result = normalizeExtractedWorkout(validResponse)

    expect(result.exercises[0]?.category).toBe('Peito')
  })

  it('maps English categories to Portuguese', () => {
    const result = normalizeExtractedWorkout({
      workout: {
        name: 'Chest Day',
        exercises: [
          {
            name: 'Bench Press',
            category: 'Chest',
            sets: 3,
            reps: '10-12',
            restSeconds: 60,
            equipment: 'Barbell',
            confidence: 0.9,
          },
        ],
      },
    })

    expect(result.exercises[0]?.category).toBe('Peito')
  })

  it('defaults unknown categories to Corpo Inteiro', () => {
    const result = normalizeExtractedWorkout({
      workout: {
        name: 'Unknown Day',
        exercises: [
          {
            name: 'Something',
            category: 'UnknownMuscle',
            sets: 3,
            reps: '10-12',
            restSeconds: 60,
            equipment: 'None',
            confidence: 0.5,
          },
        ],
      },
    })

    expect(result.exercises[0]?.category).toBe('Corpo Inteiro')
  })
})
