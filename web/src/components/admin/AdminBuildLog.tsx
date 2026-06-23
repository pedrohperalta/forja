'use client'

import { useEffect, useRef, type ReactElement } from 'react'

type AdminBuildLogProps = {
  log: string
}

export function AdminBuildLog({ log }: AdminBuildLogProps): ReactElement {
  const bottomRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [log])

  return (
    <pre className="admin-build-log" aria-live="polite">
      {log || 'Aguardando saída do processo...'}
      <span ref={bottomRef} />
    </pre>
  )
}
