import { useState, useRef, useEffect } from 'react'

type DeleteState = 'idle' | 'confirming'

const DEFAULT_TIMEOUT_MS = 5000

/**
 * Two-step delete pattern: APAGAR -> CONFIRMAR/CANCELAR.
 * Auto-resets to idle after timeout if no action is taken.
 */
export function useTwoStepDelete(
  onDelete: () => void,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): {
  deleteState: DeleteState
  requestDelete: () => void
  confirmDelete: () => void
  cancelDelete: () => void
} {
  const [deleteState, setDeleteState] = useState<DeleteState>('idle')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = (): void => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  const requestDelete = (): void => {
    setDeleteState('confirming')
    clearTimer()
    timeoutRef.current = setTimeout(() => {
      setDeleteState('idle')
    }, timeoutMs)
  }

  const confirmDelete = (): void => {
    if (deleteState !== 'confirming') return
    clearTimer()
    onDelete()
    setDeleteState('idle')
  }

  const cancelDelete = (): void => {
    clearTimer()
    setDeleteState('idle')
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimer()
    }
  }, [])

  return { deleteState, requestDelete, confirmDelete, cancelDelete }
}
