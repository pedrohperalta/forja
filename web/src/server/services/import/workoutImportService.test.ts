import { afterEach, describe, expect, it, vi } from 'vitest'

import { AdminImportExtractWorkoutResponseSchema } from '@forja/domain'

import { extractWorkoutFromImage, ImportServiceError } from './workoutImportService'

const JPEG_BASE64 = Buffer.from([0xff, 0xd8, 0xff, 0xdb]).toString('base64')
const PNG_BASE64 = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).toString('base64')
const WEBP_BASE64 = Buffer.from([
  0x52, 0x49, 0x46, 0x46, 0x08, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]).toString('base64')

describe('workout import service', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('rejects invalid base64 images', async () => {
    await expect(
      extractWorkoutFromImage({
        image: 'not-base64',
        label: 'Ficha A',
        env: importEnv(),
      }),
    ).rejects.toMatchObject(new ImportServiceError('Invalid image', 'invalid_request'))
  })

  it('rejects unsupported images', async () => {
    await expect(
      extractWorkoutFromImage({
        image: Buffer.from([0x25, 0x50, 0x44, 0x46]).toString('base64'),
        label: 'Ficha A',
        env: importEnv(),
      }),
    ).rejects.toMatchObject(
      new ImportServiceError(
        'Supported image formats are JPEG, PNG, GIF, or WebP',
        'unsupported_media_type',
      ),
    )
  })

  it('rejects images over 5 MB', async () => {
    const tooLarge = new Uint8Array(5 * 1024 * 1024 + 1)
    tooLarge.set([0xff, 0xd8, 0xff, 0xdb], 0)

    await expect(
      extractWorkoutFromImage({
        image: Buffer.from(tooLarge).toString('base64'),
        label: 'Ficha A',
        env: importEnv(),
      }),
    ).rejects.toMatchObject(
      new ImportServiceError('Image must be 5 MB or smaller', 'upload_too_large'),
    )
  })

  it('calls Anthropic with the server-only key and validates JSON output', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      Response.json({
        content: [
          {
            type: 'text',
            text: JSON.stringify(validModelOutput()),
          },
        ],
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const response = await extractWorkoutFromImage({
      image: JPEG_BASE64,
      label: 'Ficha A',
      env: importEnv(),
    })

    expect(AdminImportExtractWorkoutResponseSchema.safeParse(response).success).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-api-key': 'anthropic-secret',
        }),
      }),
    )
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(String(init.body)).toContain(JPEG_BASE64)
    expect(String(init.body)).toContain('"media_type":"image/jpeg"')
    expect(String(init.body)).not.toContain('anthropic-secret')
  })

  it('sends supported image media types to Anthropic', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          content: [{ type: 'text', text: JSON.stringify(validModelOutput()) }],
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          content: [{ type: 'text', text: JSON.stringify(validModelOutput()) }],
        }),
      )
    vi.stubGlobal('fetch', fetchMock)

    await extractWorkoutFromImage({
      image: PNG_BASE64,
      label: 'Ficha PNG',
      mediaType: 'image/png',
      env: importEnv(),
    })
    await extractWorkoutFromImage({
      image: WEBP_BASE64,
      label: 'Ficha WebP',
      mediaType: 'image/webp',
      env: importEnv(),
    })

    const [, pngInit] = fetchMock.mock.calls[0] as [string, RequestInit]
    const [, webpInit] = fetchMock.mock.calls[1] as [string, RequestInit]
    expect(String(pngInit.body)).toContain('"media_type":"image/png"')
    expect(String(webpInit.body)).toContain('"media_type":"image/webp"')
  })

  it('strips markdown fences and normalizes categories', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        Response.json({
          content: [
            {
              type: 'text',
              text: `\`\`\`json\n${JSON.stringify({
                workout: {
                  name: 'Treino Pernas',
                  exercises: [
                    {
                      name: 'Agachamento',
                      category: 'quadriceps',
                      sets: 4,
                      reps: '8-10',
                      restSeconds: 90,
                      equipment: 'Barra',
                      confidence: 0.8,
                    },
                  ],
                },
              })}\n\`\`\``,
            },
          ],
        }),
      ),
    )

    const response = await extractWorkoutFromImage({
      image: JPEG_BASE64,
      label: 'Ficha B',
      env: importEnv(),
    })

    expect(response.workout.exercises[0]?.category).toBe('Quadríceps')
  })

  it('uses the highest value when model output includes a set range', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        Response.json({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                workout: {
                  name: 'Treino Pernas',
                  exercises: [
                    {
                      name: 'Banco Extensor',
                      category: 'Quadríceps',
                      sets: '2-3',
                      reps: '8-12',
                      restSeconds: 60,
                      equipment: 'Máquina',
                      confidence: 0.9,
                    },
                  ],
                },
              }),
            },
          ],
        }),
      ),
    )

    const response = await extractWorkoutFromImage({
      image: JPEG_BASE64,
      label: 'Ficha C',
      env: importEnv(),
    })

    expect(response.workout.exercises[0]?.sets).toBe(3)
  })

  it('instructs the model to use the highest value for set ranges', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      Response.json({
        content: [{ type: 'text', text: JSON.stringify(validModelOutput()) }],
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await extractWorkoutFromImage({
      image: JPEG_BASE64,
      label: 'Ficha A',
      env: importEnv(),
    })

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(String(init.body)).toContain('If sets/series is a range')
    expect(String(init.body)).toContain('2-3')
    expect(String(init.body)).toContain('3')
  })

  it('returns a model output error for malformed model output', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        Response.json({
          content: [{ type: 'text', text: '{ definitely not json' }],
        }),
      ),
    )

    await expect(
      extractWorkoutFromImage({
        image: JPEG_BASE64,
        label: 'Ficha A',
        env: importEnv(),
      }),
    ).rejects.toMatchObject(
      new ImportServiceError('Model output is invalid', 'model_output_invalid'),
    )
  })
})

function importEnv(): {
  ANTHROPIC_API_KEY: string
  ANTHROPIC_MODEL: string
} {
  return {
    ANTHROPIC_API_KEY: 'anthropic-secret',
    ANTHROPIC_MODEL: 'claude-sonnet-4-5',
  }
}

function validModelOutput(): unknown {
  return {
    workout: {
      name: 'Treino de Peito',
      exercises: [
        {
          name: 'Supino Reto',
          category: 'peito',
          sets: 3,
          reps: '10-12',
          restSeconds: 60,
          equipment: 'Barra',
          confidence: 0.95,
        },
      ],
    },
  }
}
