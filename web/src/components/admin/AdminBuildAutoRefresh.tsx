'use client'

import { useRouter } from 'next/navigation'
import { useEffect, type ReactElement } from 'react'

type AdminBuildAutoRefreshProps = {
  enabled: boolean
  intervalMs?: number
}

export function AdminBuildAutoRefresh({
  enabled,
  intervalMs = 5000,
}: AdminBuildAutoRefreshProps): ReactElement | null {
  const router = useRouter()

  useEffect(() => {
    if (!enabled) {
      return
    }

    const intervalId = window.setInterval(() => {
      router.refresh()
    }, intervalMs)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [enabled, intervalMs, router])

  if (!enabled) {
    return null
  }

  return (
    <p className="admin-muted admin-live-refresh" aria-live="polite">
      Atualizando automaticamente a cada {Math.round(intervalMs / 1000)}s.
    </p>
  )
}
