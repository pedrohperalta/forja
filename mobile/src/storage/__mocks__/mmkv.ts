import type { StateStorage } from 'zustand/middleware'

/** In-memory Map-based StateStorage mock for tests. */
const store = new Map<string, string>()

export const mmkvStateStorage: StateStorage = {
  getItem: (name: string): string | null => {
    return store.get(name) ?? null
  },
  setItem: (name: string, value: string): void => {
    store.set(name, value)
  },
  removeItem: (name: string): void => {
    store.delete(name)
  },
}

/** Clear the in-memory store between tests. */
export function clearMockStorage(): void {
  store.clear()
}
