import { describe, expect, it } from 'vitest'

import {
  AppError,
  badRequest,
  forbidden,
  invalidCursor,
  invalidToken,
  modelOutputInvalid,
  notFound,
  payloadTooLarge,
  unauthenticated,
  unsupportedMediaType,
  validation,
} from './appError'

describe('AppError', () => {
  it('is an Error carrying an error code and HTTP status', () => {
    const error = new AppError('not_found', 'Plan not found', 404)

    expect(error).toBeInstanceOf(Error)
    expect(error.code).toBe('not_found')
    expect(error.status).toBe(404)
    expect(error.message).toBe('Plan not found')
    expect(error.expose).toBe(true)
  })

  it('can hide its message from clients', () => {
    const error = new AppError('internal_error', 'secret detail', 500, false)

    expect(error.expose).toBe(false)
  })
})

describe('error constructors', () => {
  it('map to the expected code and status', () => {
    expect([badRequest().code, badRequest().status]).toEqual(['invalid_request', 400])
    expect([validation().code, validation().status]).toEqual(['validation_error', 422])
    expect([unauthenticated().code, unauthenticated().status]).toEqual(['unauthenticated', 401])
    expect([invalidToken().code, invalidToken().status]).toEqual(['invalid_token', 401])
    expect([forbidden().code, forbidden().status]).toEqual(['forbidden', 403])
    expect([notFound().code, notFound().status]).toEqual(['not_found', 404])
    expect([invalidCursor().code, invalidCursor().status]).toEqual(['invalid_cursor', 400])
    expect([payloadTooLarge().code, payloadTooLarge().status]).toEqual(['upload_too_large', 413])
    expect([unsupportedMediaType().code, unsupportedMediaType().status]).toEqual([
      'unsupported_media_type',
      415,
    ])
    expect([modelOutputInvalid().code, modelOutputInvalid().status]).toEqual([
      'model_output_invalid',
      422,
    ])
  })

  it('keeps the provided message', () => {
    expect(notFound('Plan not found').message).toBe('Plan not found')
  })
})
