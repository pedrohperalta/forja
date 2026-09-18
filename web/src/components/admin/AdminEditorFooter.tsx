'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type ReactElement } from 'react'

import { StatusPill } from '@/components/admin/AdminUi'
import { describePlanDiffEntry, type PlanDiffEntry } from '@/lib/planDiff'
import type { PublicationStatus } from '@/lib/publicationState'

const AUTOSAVE_DELAY_MS = 1500
const DRAFT_CHANGED_EVENT = 'admin-draft-changed'

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error' | 'invalid'

type AdminEditorFooterProps = {
  archived: boolean
  formId: string
  latestRevisionNumber: number | null
  previewHref: string
  publicationDiff: PlanDiffEntry[]
  publishAction: (formData: FormData) => Promise<void>
  restoreAction: (formData: FormData) => Promise<void>
  saveDraftAction: (formData: FormData) => Promise<void>
  status: PublicationStatus
}

/**
 * Sticky publication footer. Owns the draft autosave: it listens for edits on
 * the associated draft form (by id, from anywhere in the page) and for the
 * `admin-draft-changed` event the form dispatches after structural changes
 * such as reorders.
 */
export function AdminEditorFooter({
  archived,
  formId,
  latestRevisionNumber,
  previewHref,
  publicationDiff,
  publishAction,
  restoreAction,
  saveDraftAction,
  status,
}: AdminEditorFooterProps): ReactElement {
  const autosaveTimerRef = useRef<number | null>(null)
  const runAutosaveRef = useRef((): Promise<void> => Promise.resolve())
  const scheduleAutosaveRef = useRef((): void => {})
  const hasUnsavedChangesRef = useRef(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [, setSaveTick] = useState(0)

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current !== null) {
        window.clearTimeout(autosaveTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (saveState !== 'saved') {
      return
    }

    const interval = window.setInterval(() => {
      setSaveTick((tick) => tick + 1)
    }, 5000)

    return () => {
      window.clearInterval(interval)
    }
  }, [saveState])

  useEffect(() => {
    const beforeUnloadHandler = (event: BeforeUnloadEvent): void => {
      if (!hasUnsavedChangesRef.current) {
        return
      }

      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', beforeUnloadHandler)

    return () => {
      window.removeEventListener('beforeunload', beforeUnloadHandler)
    }
  }, [])

  useEffect(() => {
    const form = document.getElementById(formId)

    if (!(form instanceof HTMLFormElement) || archived) {
      return
    }

    const handler = () => {
      scheduleAutosaveRef.current()
    }

    form.addEventListener('input', handler)
    form.addEventListener('change', handler)
    form.addEventListener(DRAFT_CHANGED_EVENT, handler)

    return () => {
      form.removeEventListener('input', handler)
      form.removeEventListener('change', handler)
      form.removeEventListener(DRAFT_CHANGED_EVENT, handler)
    }
  }, [formId, archived])

  function scheduleAutosave(): void {
    if (archived) {
      return
    }

    setSaveState('dirty')
    hasUnsavedChangesRef.current = true

    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current)
    }

    autosaveTimerRef.current = window.setTimeout(() => {
      void runAutosaveRef.current()
    }, AUTOSAVE_DELAY_MS)
  }

  scheduleAutosaveRef.current = scheduleAutosave

  async function runAutosave(): Promise<void> {
    const form = document.getElementById(formId)

    if (!(form instanceof HTMLFormElement) || archived) {
      return
    }

    if (!form.checkValidity()) {
      setSaveState('invalid')
      return
    }

    setSaveState('saving')

    try {
      await saveDraftAction(new FormData(form))
      setSavedAt(new Date())
      setSaveState('saved')
      hasUnsavedChangesRef.current = false
    } catch {
      setSaveState('error')
    }
  }

  runAutosaveRef.current = runAutosave

  return (
    <footer className="admin-editor-footer">
      {publicationDiff.length > 0 ? (
        <details className="admin-publish-diff">
          <summary>
            {publicationDiff.length}{' '}
            {publicationDiff.length === 1 ? 'alteração' : 'alterações'} desde a Rev.{' '}
            {latestRevisionNumber}
          </summary>
          <ul className="admin-publish-diff-list">
            {publicationDiff.map((entry, entryIndex) => (
              <li key={`${entry.kind}-${entryIndex}`}>{describePlanDiffEntry(entry)}</li>
            ))}
          </ul>
        </details>
      ) : null}

      <div className="admin-editor-actionbar">
        <div className="admin-editor-actionbar-state">
          <StatusPill tone={status.tone}>{status.label}</StatusPill>
          <span className="admin-save-state" role="status">
            {getActionbarStateLabel(saveState, savedAt, status.description)}
          </span>
        </div>
        <div className="admin-editor-actionbar-actions">
          {archived ? (
            <button className="admin-primary-button" form={formId} formAction={restoreAction} type="submit">
              Restaurar para editar
            </button>
          ) : (
            <>
              {saveState === 'dirty' ? (
                <button
                  className="admin-secondary-button admin-compact-button"
                  onClick={() => {
                    void runAutosave()
                  }}
                  type="button"
                >
                  Salvar agora
                </button>
              ) : null}
              {saveState === 'error' ? (
                <button
                  className="admin-secondary-button admin-compact-button"
                  onClick={() => {
                    void runAutosave()
                  }}
                  type="button"
                >
                  Tentar de novo
                </button>
              ) : null}
              <Link className="admin-secondary-button admin-compact-button" href={previewHref}>
                Pré-visualizar
              </Link>
              {status.canPublish ? (
                <button
                  className="admin-primary-button"
                  form={formId}
                  formAction={publishAction}
                  type="submit"
                >
                  {status.publishLabel}
                </button>
              ) : (
                <button className="admin-secondary-button" disabled type="button">
                  {status.publishLabel}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </footer>
  )
}

function getActionbarStateLabel(
  saveState: SaveState,
  savedAt: Date | null,
  idleDescription: string,
): string {
  if (saveState === 'saving') {
    return 'Salvando…'
  }

  if (saveState === 'error') {
    return 'Falhou ao salvar'
  }

  if (saveState === 'dirty') {
    return 'Alterações não salvas'
  }

  if (saveState === 'invalid') {
    return 'Não salvo — corrija os campos destacados'
  }

  if (saveState === 'saved') {
    if (!savedAt) {
      return 'Salvo'
    }

    const seconds = Math.max(0, Math.floor((Date.now() - savedAt.getTime()) / 1000))

    if (seconds < 5) {
      return 'Salvo agora'
    }

    if (seconds < 60) {
      return `Salvo há ${seconds}s`
    }

    return `Salvo há ${Math.floor(seconds / 60)}min`
  }

  return idleDescription
}
