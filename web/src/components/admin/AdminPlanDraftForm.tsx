'use client'

import type { MuscleCategory, Plan } from '@forja/domain'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { DragEvent, KeyboardEvent, ReactElement } from 'react'
import { useEffect, useRef, useState } from 'react'

import { AdminCard, AdminField, StatusPill } from '@/components/admin/AdminUi'
import { AdminSubmitButton } from '@/components/admin/AdminSubmitButton'
import type { PublicationStatus } from '@/lib/publicationState'
import { describePlanDiffEntry, type PlanDiffEntry } from '@/lib/planDiff'
type ServerAction = (formData: FormData) => Promise<void>

const AUTOSAVE_DELAY_MS = 1500

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

type AdminPlanDraftFormProps = {
  addedExerciseId?: string | undefined
  archived: boolean
  categoryOptions: readonly MuscleCategory[]
  draft: Plan
  latestRevisionNumber: number | null
  planId: string
  previewHref: string
  publicationDiff: PlanDiffEntry[]
  publishAction: ServerAction
  removeExerciseAction: ServerAction
  restoreAction?: ServerAction | undefined
  saveDraftAction: ServerAction
  status: PublicationStatus
}

export function AdminPlanDraftForm({
  addedExerciseId,
  archived,
  categoryOptions,
  draft,
  latestRevisionNumber,
  planId,
  previewHref,
  publicationDiff,
  publishAction,
  removeExerciseAction,
  restoreAction,
  saveDraftAction,
  status,
}: AdminPlanDraftFormProps): ReactElement {
  const formRef = useRef<HTMLFormElement>(null)
  const autosaveTimerRef = useRef<number | null>(null)
  const runAutosaveRef = useRef((): Promise<void> => Promise.resolve())
  const router = useRouter()
  const [exerciseIds, setExerciseIds] = useState(() =>
    draft.exercises.map((exercise) => exercise.id),
  )
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [removingExerciseId, setRemovingExerciseId] = useState<string | null>(null)
  const [removeFailedExerciseId, setRemoveFailedExerciseId] = useState<string | null>(null)
  const [, setSaveTick] = useState(0)

  // Reconcile local order with refreshed draft data (e.g. after a removal
  // triggered by a direct action call, which refreshes without remounting).
  useEffect(() => {
    setExerciseIds((current) => {
      const draftIds = draft.exercises.map((exercise) => exercise.id)
      const currentSet = new Set(current)
      const kept = draftIds.filter((id) => currentSet.has(id))
      const keptSet = new Set(kept)
      const appended = draftIds.filter((id) => !keptSet.has(id))
      const next = [...kept, ...appended]

      if (next.length === current.length && next.every((id, index) => id === current[index])) {
        return current
      }

      return next
    })
  }, [draft])

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

  const orderedExercises = exerciseIds
    .map((exerciseId) => draft.exercises.find((exercise) => exercise.id === exerciseId))
    .filter((exercise): exercise is Plan['exercises'][number] => Boolean(exercise))

  function scheduleAutosave(): void {
    if (archived) {
      return
    }

    setSaveState('dirty')

    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current)
    }

    autosaveTimerRef.current = window.setTimeout(() => {
      void runAutosaveRef.current()
    }, AUTOSAVE_DELAY_MS)
  }

  const scheduleAutosaveRef = useRef(scheduleAutosave)
  scheduleAutosaveRef.current = scheduleAutosave

  async function runAutosave(): Promise<void> {
    const form = formRef.current

    if (!form || archived || !form.checkValidity()) {
      return
    }

    setSaveState('saving')

    try {
      await saveDraftAction(new FormData(form))
      setSavedAt(new Date())
      setSaveState('saved')
    } catch {
      setSaveState('error')
    }
  }

  runAutosaveRef.current = runAutosave

  async function removeExercise(exerciseId: string): Promise<void> {
    if (archived || removingExerciseId !== null) {
      return
    }

    setRemovingExerciseId(exerciseId)
    setRemoveFailedExerciseId(null)

    try {
      const formData = new FormData()
      formData.set('planId', planId)
      formData.set('removeExerciseId', exerciseId)

      await removeExerciseAction(formData)
      router.refresh()
    } catch {
      setRemoveFailedExerciseId(exerciseId)
    } finally {
      setRemovingExerciseId(null)
    }
  }

  useEffect(() => {
    const form = formRef.current

    if (!form || archived) {
      return
    }

    const handler = () => {
      scheduleAutosaveRef.current()
    }

    form.addEventListener('input', handler)
    form.addEventListener('change', handler)

    return () => {
      form.removeEventListener('input', handler)
      form.removeEventListener('change', handler)
    }
  }, [archived])

  function moveExercise(sourceId: string, targetId: string): void {
    if (archived || sourceId === targetId) {
      return
    }

    setExerciseIds((currentExerciseIds) => {
      const sourceIndex = currentExerciseIds.indexOf(sourceId)
      const targetIndex = currentExerciseIds.indexOf(targetId)

      if (sourceIndex === -1 || targetIndex === -1) {
        return currentExerciseIds
      }

      const nextExerciseIds = [...currentExerciseIds]
      const [movedExerciseId] = nextExerciseIds.splice(sourceIndex, 1)

      if (!movedExerciseId) {
        return currentExerciseIds
      }

      nextExerciseIds.splice(targetIndex, 0, movedExerciseId)
      scheduleAutosave()

      return nextExerciseIds
    })
  }

  function handleDragStart(event: DragEvent, exerciseId: string): void {
    if (archived) {
      event.preventDefault()
      return
    }

    setDraggingId(exerciseId)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', exerciseId)
  }

  function handleDragOver(event: DragEvent, exerciseId: string): void {
    if (archived || !draggingId || draggingId === exerciseId) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDropTargetId(exerciseId)
  }

  function handleDrop(event: DragEvent, targetId: string): void {
    event.preventDefault()
    const sourceId = event.dataTransfer.getData('text/plain') || draggingId

    if (sourceId) {
      moveExercise(sourceId, targetId)
    }

    setDraggingId(null)
    setDropTargetId(null)
  }

  function handleDragEnd(): void {
    setDraggingId(null)
    setDropTargetId(null)
  }

  function handleHandleKeyDown(event: KeyboardEvent<HTMLButtonElement>, exerciseId: string): void {
    if (archived) {
      return
    }

    const currentIndex = exerciseIds.indexOf(exerciseId)
    const nextIndex =
      event.key === 'ArrowUp'
        ? currentIndex - 1
        : event.key === 'ArrowDown'
          ? currentIndex + 1
          : currentIndex
    const targetId = exerciseIds[nextIndex]

    if ((event.key === 'ArrowUp' || event.key === 'ArrowDown') && targetId) {
      event.preventDefault()
      moveExercise(exerciseId, targetId)
    }
  }

  return (
    <form
      action={saveDraftAction}
      className="admin-plan-draft-form"
      encType="multipart/form-data"
      id={`plan-draft-${planId}`}
      ref={formRef}
    >
      <input name="planId" type="hidden" value={planId} />
      <input name="exerciseOrder" type="hidden" value={exerciseIds.join(',')} />

      <section className="admin-section" aria-label="Dados do plano">
        <AdminCard accent>
          <div className="admin-form-heading">
            <div>
              <p className="admin-section-title">Rascunho estruturado</p>
              <p className="admin-muted">
                As edições salvam sozinhas. Publicar é o único gesto que muda o app.
              </p>
            </div>
            <div className="admin-publication-meta">
              <span className="admin-tag">
                {latestRevisionNumber ? `Rev. ${latestRevisionNumber}` : 'Sem revisão'}
              </span>
              <span className="admin-tag">{draft.exercises.length} exercícios</span>
            </div>
          </div>
          <div className="admin-form-grid">
            <AdminField label="Rótulo">
              <input
                className="admin-input"
                disabled={archived}
                name="label"
                required
                defaultValue={draft.label}
              />
            </AdminField>
            <AdminField label="Foco">
              <input
                className="admin-input"
                disabled={archived}
                name="focus"
                required
                defaultValue={draft.focus}
              />
            </AdminField>
          </div>
        </AdminCard>
      </section>

      <section className="admin-section" aria-label="Exercícios">
        <div className="admin-section-heading-row">
          <h2 className="admin-section-title">Exercícios</h2>
          <p className="admin-drag-instructions">Arraste para reordenar</p>
        </div>
        {orderedExercises.length === 0 ? (
          <AdminCard className="admin-empty-state">
            <p className="admin-section-title">Nenhum exercício ainda</p>
            <p className="admin-muted">
              Adicione o primeiro movimento abaixo. Séries, descanso e equipamento têm padrões
              prontos — ajuste depois.
            </p>
          </AdminCard>
        ) : null}
        {orderedExercises.map((exercise, index) => {
          const isDragging = draggingId === exercise.id
          const isDropTarget = dropTargetId === exercise.id
          const wasJustAdded = exercise.id === addedExerciseId
          const needsReview = exercise.needsReview === true

          return (
            <AdminCard
              key={exercise.id}
              className={`admin-exercise-card admin-draggable-exercise${
                isDragging ? ' is-dragging' : ''
              }${isDropTarget ? ' is-drop-target' : ''}${
                needsReview ? ' admin-exercise-card-needs-review' : ''
              }`}
            >
              <details
                className="admin-exercise-editor"
                onDragOver={(event) => handleDragOver(event, exercise.id)}
                onDrop={(event) => handleDrop(event, exercise.id)}
                open={wasJustAdded || needsReview || undefined}
              >
                <summary>
                  <button
                    aria-label={`Arraste para reordenar ${exercise.name}`}
                    className="admin-drag-icon-button"
                    disabled={archived}
                    draggable={!archived}
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                    }}
                    onDragEnd={handleDragEnd}
                    onDragStart={(event) => handleDragStart(event, exercise.id)}
                    onKeyDown={(event) => handleHandleKeyDown(event, exercise.id)}
                    title="Arraste para reordenar. Use seta para cima ou para baixo pelo teclado."
                    type="button"
                  >
                    <svg
                      aria-hidden="true"
                      className="admin-drag-icon"
                      focusable="false"
                      viewBox="0 0 16 16"
                    >
                      <circle cx="5" cy="4" r="1.35" />
                      <circle cx="11" cy="4" r="1.35" />
                      <circle cx="5" cy="8" r="1.35" />
                      <circle cx="11" cy="8" r="1.35" />
                      <circle cx="5" cy="12" r="1.35" />
                      <circle cx="11" cy="12" r="1.35" />
                    </svg>
                  </button>
                  <span className="admin-chip">#{index + 1}</span>
                  <span className="admin-exercise-summary-copy">
                    <strong>{exercise.name}</strong>
                    <small>
                      {exercise.category} · {exercise.equipment}
                    </small>
                  </span>
                  <span className="admin-exercise-summary-actions">
                    {needsReview ? <StatusPill tone="warning">Revisar</StatusPill> : null}
                    <StatusPill>{exercise.category}</StatusPill>
                    <span className="admin-exercise-toggle" aria-hidden="true" />
                  </span>
                </summary>
                <input name="exerciseId" type="hidden" value={exercise.id} />
                <div className="admin-form-grid">
                  <AdminField label="Nome">
                    <input
                      autoFocus={wasJustAdded || undefined}
                      className="admin-input"
                      disabled={archived}
                      name="exerciseName"
                      required
                      defaultValue={exercise.name}
                    />
                  </AdminField>
                  <AdminField label="Categoria">
                    <select
                      className="admin-input"
                      disabled={archived}
                      name="exerciseCategory"
                      defaultValue={exercise.category}
                    >
                      {categoryOptions.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </AdminField>
                </div>
                <div className="admin-equipment-photo-upload">
                  <div>
                    <p>Foto do aparelho</p>
                    <small>JPEG até 5 MB. A imagem aparece no app após sincronizar.</small>
                  </div>
                  <input
                    accept="image/jpeg"
                    className="admin-equipment-photo-input"
                    disabled={archived}
                    name={`exercisePhoto:${exercise.id}`}
                    type="file"
                  />
                </div>
                <details className="admin-exercise-advanced">
                  <summary>Ajustes avançados</summary>
                  <div className="admin-form-grid">
                    <AdminField label="Equipamento">
                      <input
                        className="admin-input"
                        disabled={archived}
                        name="exerciseEquipment"
                        required
                        defaultValue={exercise.equipment}
                      />
                    </AdminField>
                    <AdminField label="Repetições">
                      <input
                        className="admin-input"
                        disabled={archived}
                        name="exerciseReps"
                        required
                        defaultValue={exercise.reps}
                      />
                    </AdminField>
                    <AdminField label="Séries">
                      <input
                        className="admin-input"
                        disabled={archived}
                        min={1}
                        name="exerciseSets"
                        required
                        type="number"
                        defaultValue={exercise.sets}
                      />
                    </AdminField>
                    <AdminField label="Descanso">
                      <input
                        className="admin-input"
                        disabled={archived}
                        min={0}
                        name="exerciseRestSeconds"
                        required
                        type="number"
                        defaultValue={exercise.restSeconds}
                      />
                    </AdminField>
                  </div>
                </details>
                {archived ? null : (
                  <details className="admin-exercise-remove">
                    <summary>Remover exercício</summary>
                    <p className="admin-muted">
                      O exercício sai do rascunho. A última revisão publicada permanece no app.
                    </p>
                    {removeFailedExerciseId === exercise.id ? (
                      <p className="admin-field-error" role="alert">
                        Não foi possível remover. Tente de novo.
                      </p>
                    ) : null}
                    <button
                      className="admin-danger-button admin-compact-button"
                      disabled={removingExerciseId !== null}
                      onClick={() => {
                        void removeExercise(exercise.id)
                      }}
                      type="button"
                    >
                      {removingExerciseId === exercise.id ? (
                        <>
                          <span
                            aria-hidden="true"
                            className="admin-button-spinner admin-button-spinner-light"
                          />
                          Removendo…
                        </>
                      ) : (
                        'Confirmar remoção'
                      )}
                    </button>
                  </details>
                )}
              </details>
            </AdminCard>
          )
        })}
      </section>

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
            restoreAction ? (
              <AdminSubmitButton
                className="admin-primary-button bg-accent"
                formAction={restoreAction}
                spinnerTone="light"
              >
                Restaurar para editar
              </AdminSubmitButton>
            ) : null
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
              <Link
                className="admin-secondary-button admin-compact-button"
                href={previewHref}
                target="_blank"
              >
                Pré-visualizar
              </Link>
              {status.canPublish ? (
                <AdminSubmitButton
                  className="admin-primary-button bg-accent"
                  formAction={publishAction}
                >
                  {status.publishLabel}
                </AdminSubmitButton>
              ) : (
                <button className="admin-secondary-button" disabled type="button">
                  {status.publishLabel}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </form>
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
