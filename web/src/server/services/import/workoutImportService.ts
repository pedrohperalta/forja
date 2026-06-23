import { z } from 'zod'

import {
  AdminImportExtractWorkoutResponseSchema,
  MUSCLE_CATEGORIES,
  type AdminImportExtractWorkoutResponse,
} from '@forja/domain'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages'

const ImportEnvSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1),
  ANTHROPIC_MODEL: z.string().min(1),
})

const AnthropicTextBlockSchema = z.object({
  type: z.literal('text'),
  text: z.string(),
})

const AnthropicResponseSchema = z.object({
  content: z.array(AnthropicTextBlockSchema),
})

export type ImportEnv = z.infer<typeof ImportEnvSchema>
type SupportedImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

export class ImportServiceError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'invalid_request'
      | 'unsupported_media_type'
      | 'upload_too_large'
      | 'model_output_invalid'
      | 'internal_error',
  ) {
    super(message)
  }
}

export type ExtractWorkoutInput = {
  image: string
  label: string
  mediaType?: SupportedImageMediaType
  env: ImportEnv
}

export function readImportEnv(env: NodeJS.ProcessEnv = process.env): ImportEnv {
  const result = ImportEnvSchema.safeParse(env)

  if (!result.success) {
    throw new ImportServiceError('Import environment is invalid', 'internal_error')
  }

  return result.data
}

export async function extractWorkoutFromImage(
  input: ExtractWorkoutInput,
): Promise<AdminImportExtractWorkoutResponse> {
  const imageBytes = decodeBase64Image(input.image)
  const mediaType = getSupportedImageMediaType(imageBytes, input.mediaType)

  const response = await fetch(ANTHROPIC_MESSAGES_URL, {
    method: 'POST',
    headers: {
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'x-api-key': input.env.ANTHROPIC_API_KEY,
    },
    body: JSON.stringify({
      model: input.env.ANTHROPIC_MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: stripDataUrl(input.image),
              },
            },
            {
              type: 'text',
              text: importPrompt(input.label),
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    throw new ImportServiceError('Workout extraction failed', 'internal_error')
  }

  const anthropicBody = AnthropicResponseSchema.safeParse(await response.json())
  if (!anthropicBody.success) {
    throw new ImportServiceError('Model output is invalid', 'model_output_invalid')
  }

  return parseModelOutput(anthropicBody.data.content.map((block) => block.text).join('\n'))
}

function decodeBase64Image(image: string): Uint8Array {
  const base64 = stripDataUrl(image)

  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length % 4 !== 0) {
    throw new ImportServiceError('Invalid image', 'invalid_request')
  }

  const bytes = Buffer.from(base64, 'base64')
  if (bytes.length === 0 || bytes.toString('base64') !== base64) {
    throw new ImportServiceError('Invalid image', 'invalid_request')
  }

  if (bytes.length > MAX_IMAGE_BYTES) {
    throw new ImportServiceError('Image must be 5 MB or smaller', 'upload_too_large')
  }

  return new Uint8Array(bytes)
}

function getSupportedImageMediaType(
  bytes: Uint8Array,
  requestedMediaType: SupportedImageMediaType = 'image/jpeg',
): SupportedImageMediaType {
  const detectedMediaType = detectImageMediaType(bytes)

  if (!detectedMediaType) {
    throw new ImportServiceError(
      'Supported image formats are JPEG, PNG, GIF, or WebP',
      'unsupported_media_type',
    )
  }

  return detectedMediaType ?? requestedMediaType
}

function detectImageMediaType(bytes: Uint8Array): SupportedImageMediaType | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg'
  }

  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png'
  }

  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    return 'image/gif'
  }

  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp'
  }

  return null
}

function stripDataUrl(image: string): string {
  const marker = 'base64,'
  const markerIndex = image.indexOf(marker)

  return markerIndex >= 0 ? image.slice(markerIndex + marker.length) : image
}

function parseModelOutput(text: string): AdminImportExtractWorkoutResponse {
  const trimmed = stripMarkdownFence(text)

  try {
    const normalized = normalizeModelOutput(JSON.parse(trimmed) as unknown)
    const parsed = AdminImportExtractWorkoutResponseSchema.safeParse(normalized)

    if (!parsed.success) {
      throw new ImportServiceError('Model output is invalid', 'model_output_invalid')
    }

    return parsed.data
  } catch (error) {
    if (error instanceof ImportServiceError) {
      throw error
    }

    throw new ImportServiceError('Model output is invalid', 'model_output_invalid')
  }
}

function stripMarkdownFence(text: string): string {
  const trimmed = text.trim()
  const match = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed)

  return match?.[1] ?? trimmed
}

function normalizeModelOutput(value: unknown): unknown {
  if (!isRecord(value)) {
    return value
  }

  const workout = value.workout
  if (!isRecord(workout) || !Array.isArray(workout.exercises)) {
    return value
  }

  return {
    ...value,
    workout: {
      ...workout,
      exercises: (workout.exercises as unknown[]).map((exercise) => {
        if (!isRecord(exercise)) {
          return exercise
        }

        return {
          ...exercise,
          category:
            typeof exercise.category === 'string'
              ? normalizeCategory(exercise.category)
              : exercise.category,
          sets: normalizeSets(exercise.sets),
        }
      }),
    },
  }
}

function normalizeSets(sets: unknown): unknown {
  if (typeof sets === 'number') {
    return sets
  }

  if (typeof sets !== 'string') {
    return sets
  }

  const values = sets
    .match(/\d+/g)
    ?.map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0)

  if (!values?.length) {
    return sets
  }

  return Math.max(...values)
}

function normalizeCategory(category: string): string {
  const normalized = normalizeText(category)
  const canonical = MUSCLE_CATEGORIES.find((candidate) => normalizeText(candidate) === normalized)

  return canonical ?? category
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function importPrompt(label: string): string {
  return [
    `Extract the workout plan from the uploaded image for "${label}".`,
    'Return only JSON with this exact shape:',
    '{"workout":{"name":"string","exercises":[{"name":"string","category":"Peito","sets":3,"reps":"10-12","restSeconds":60,"equipment":"string","confidence":0.9}]}}',
    'If sets/series is a range like 2-3, use the highest value as the numeric sets field, e.g. 3.',
    `Allowed categories: ${MUSCLE_CATEGORIES.join(', ')}.`,
  ].join('\n')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
