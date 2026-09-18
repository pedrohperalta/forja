'use client'

import { useEffect, useRef, type ReactElement } from 'react'

type AdminBuildLogProps = {
  log: string
}

/** Distance (px) from the bottom that still counts as "following" the log. */
const FOLLOW_THRESHOLD_PX = 48

export function AdminBuildLog({ log }: AdminBuildLogProps): ReactElement {
  const preRef = useRef<HTMLPreElement>(null)

  useEffect(() => {
    const pre = preRef.current

    if (!pre) {
      return
    }

    const distanceFromBottom = pre.scrollHeight - pre.scrollTop - pre.clientHeight

    if (distanceFromBottom <= FOLLOW_THRESHOLD_PX) {
      pre.scrollTop = pre.scrollHeight
    }
  }, [log])

  return (
    <pre className="admin-build-log" ref={preRef}>
      {log || 'Aguardando saída do processo...'}
    </pre>
  )
}
