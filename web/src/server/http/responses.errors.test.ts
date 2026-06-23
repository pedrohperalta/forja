import { describe, expect, it, vi } from 'vitest'

import { notFound } from './appError'
import { toErrorResponse } from './responses'

type ErrorBody = { error: { code: string; message: string; requestId: string } }

describe('toErrorResponse', () => {
  it('maps an AppError to its code, message, and status', async () => {
    const response = toErrorResponse(notFound('Plan not found'), 'req-1')
    const body = (await response.json()) as ErrorBody

    expect(response.status).toBe(404)
    expect(response.headers.get('x-request-id')).toBe('req-1')
    expect(body.error).toEqual({
      code: 'not_found',
      message: 'Plan not found',
      requestId: 'req-1',
    })
  })

  it('maps a JSON SyntaxError to invalid_request 400', async () => {
    const response = toErrorResponse(new SyntaxError('Unexpected token'), 'req-2')
    const body = (await response.json()) as ErrorBody

    expect(response.status).toBe(400)
    expect(body.error.code).toBe('invalid_request')
  })

  it('maps an unknown error to internal_error 500 without leaking its message', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const response = toErrorResponse(new Error('database password is hunter2'), 'req-3')
    const body = (await response.json()) as ErrorBody

    expect(response.status).toBe(500)
    expect(body.error.code).toBe('internal_error')
    expect(body.error.message).not.toContain('hunter2')
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})
