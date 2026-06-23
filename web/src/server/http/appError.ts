import type { ErrorCode } from './responses'

/**
 * Domain/transport error carrying the HTTP status and error code that a route
 * should return. Services throw these; `toErrorResponse` maps them to a JSON
 * response. Unknown errors (anything that is not an AppError) become a 500 so
 * internal details never leak to clients.
 */
export class AppError extends Error {
  readonly code: ErrorCode
  readonly status: number
  readonly expose: boolean

  constructor(code: ErrorCode, message: string, status: number, expose = true) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.status = status
    this.expose = expose
  }
}

export const badRequest = (message = 'Invalid request'): AppError =>
  new AppError('invalid_request', message, 400)

export const validation = (message = 'Validation failed'): AppError =>
  new AppError('validation_error', message, 422)

export const unauthenticated = (message = 'Unauthenticated'): AppError =>
  new AppError('unauthenticated', message, 401)

export const invalidToken = (message = 'Invalid token'): AppError =>
  new AppError('invalid_token', message, 401)

export const forbidden = (message = 'Forbidden'): AppError =>
  new AppError('forbidden', message, 403)

export const notFound = (message = 'Not found'): AppError => new AppError('not_found', message, 404)

export const invalidCursor = (message = 'Invalid cursor'): AppError =>
  new AppError('invalid_cursor', message, 400)

export const payloadTooLarge = (message = 'Payload too large'): AppError =>
  new AppError('upload_too_large', message, 413)

export const unsupportedMediaType = (message = 'Unsupported media type'): AppError =>
  new AppError('unsupported_media_type', message, 415)

export const modelOutputInvalid = (message = 'Model output is invalid'): AppError =>
  new AppError('model_output_invalid', message, 422)
