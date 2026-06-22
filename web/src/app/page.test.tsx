import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  },
}))

describe('/', () => {
  it('routes the root entry point into the admin tool', async () => {
    const { default: HomePage } = await import('./page')

    expect(() => HomePage()).toThrow('NEXT_REDIRECT:/admin')
  })
})
