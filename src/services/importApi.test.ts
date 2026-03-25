/**
 * importApi tests — TDD: tests first, implementation second.
 *
 * Tests extractWorkout: success, 422 error, network error,
 * Zod validation failure, and category normalization.
 */

import { extractWorkout } from '@/services/importApi'

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn().mockResolvedValue('base64-image-data'),
}))

// Mock environment variables
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

// Mock global fetch
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
  })

  it('returns extracted workout on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => validResponse,
    })

    const result = await extractWorkout('file:///photo.jpg', 'A')

    expect(result.name).toBe('Treino de Peito')
    expect(result.exercises).toHaveLength(1)
    expect(result.exercises[0]?.name).toBe('Supino Reto')
  })

  it('sends correct request to Supabase edge function', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => validResponse,
    })

    await extractWorkout('file:///photo.jpg', 'A')

    expect(mockFetch).toHaveBeenCalledWith(
      'https://test.supabase.co/functions/v1/extract-workout',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-anon-key',
        }),
        body: expect.stringContaining('base64-image-data'),
      }),
    )
  })

  it('throws on 422 error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ error: 'Could not extract workout' }),
    })

    await expect(extractWorkout('file:///photo.jpg', 'A')).rejects.toThrow(
      'Could not extract workout',
    )
  })

  it('throws on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network request failed'))

    await expect(extractWorkout('file:///photo.jpg', 'A')).rejects.toThrow('Network request failed')
  })

  it('throws on Zod validation failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ workout: { name: 'Bad', exercises: [] } }),
    })

    await expect(extractWorkout('file:///photo.jpg', 'A')).rejects.toThrow()
  })

  describe('category normalization', () => {
    it('passes through valid Portuguese categories', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => validResponse,
      })

      const result = await extractWorkout('file:///photo.jpg', 'A')
      expect(result.exercises[0]?.category).toBe('Peito')
    })

    it('maps English categories to Portuguese', async () => {
      const response = {
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
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => response,
      })

      const result = await extractWorkout('file:///photo.jpg', 'A')
      expect(result.exercises[0]?.category).toBe('Peito')
    })

    it('defaults unknown categories to Corpo Inteiro', async () => {
      const response = {
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
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => response,
      })

      const result = await extractWorkout('file:///photo.jpg', 'A')
      expect(result.exercises[0]?.category).toBe('Corpo Inteiro')
    })
  })
})
