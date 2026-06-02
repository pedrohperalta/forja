type StoredValue = string | number | boolean | ArrayBuffer

const storage = new Map<string, StoredValue>()

export type MMKV = {
  getString: (key: string) => string | undefined
  set: (key: string, value: StoredValue) => void
  remove: (key: string) => void
}

export function createMMKV(): MMKV {
  return {
    getString: (key: string): string | undefined => {
      const value = storage.get(key)
      return typeof value === 'string' ? value : undefined
    },
    set: (key: string, value: StoredValue): void => {
      storage.set(key, value)
    },
    remove: (key: string): void => {
      storage.delete(key)
    },
  }
}

export function clearMockMmkv(): void {
  storage.clear()
}
