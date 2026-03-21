import { createMMKV } from 'react-native-mmkv'
import type { MMKV } from 'react-native-mmkv'
import type { StateStorage } from 'zustand/middleware'

/** Shared MMKV instance for all persisted stores. */
export const mmkv: MMKV = createMMKV({ id: 'forja-storage' })

/** Zustand StateStorage adapter backed by MMKV. */
export const mmkvStateStorage: StateStorage = {
  getItem: (name: string): string | null => {
    const value = mmkv.getString(name)
    return value ?? null
  },
  setItem: (name: string, value: string): void => {
    mmkv.set(name, value)
  },
  removeItem: (name: string): void => {
    mmkv.remove(name)
  },
}
