'use client'

import type { MuscleCategory, Plan } from '@forja/domain'
import { useRouter } from 'next/navigation'
import type { DragEvent, KeyboardEvent, ReactElement } from 'react'
import { useEffect, useRef, useState } from 'react'

import { ChevronDownIcon } from '@/components/admin/AdminIcons'
import { AdminCard, AdminField, StatusPill } from '@/components/admin/AdminUi'

type ServerAction = (formData: FormData) => Promise<void>

const DRAFT_CHANGED_EVENT = 'admin-draft-changed'

type AdminPlanDraftFormProps = {
  addedExerciseId?: string | undefined
  archived: boolean
  categoryOptions: readonly MuscleCategory[]
  draft: Plan
  latestRevisionNumber: number | null
  planId: string
  removeExerciseAction: ServerAction
  saveDraftAction: ServerAction
}

export function AdminPlanDraftForm({
  addedExerciseId,
  archived,
  categoryOptions,
  draft,
  latestRevisionNumber,
  planId,
  removeExerciseAction,
  saveDraftAction,
}: AdminPlanDraftFormProps): ReactElement {
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()
  const [exerciseIds, setExerciseIds] = useState(() =>
    draft.exercises.map((exercise) => exercise.id),
  )
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [removingExerciseId, setRemovingExerciseId] = useState<string | null>(null)
  const [removeFailedExerciseId, setRemoveFailedExerciseId] = useState<string | null>(null)

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

  const orderedExercises = exerciseIds
    .map((exerciseId) => draft.exercises.find((exercise) => exercise.id === exerciseId))
    .filter((exercise): exercise is Plan['exercises'][number] => Boolean(exercise))

  function moveExercise(sourceId: string, targetId: string): void {
    if (archived || sourceId === targetId) {
      return
    }

    const sourceIndex = exerciseIds.indexOf(sourceId)
    const targetIndex = exerciseIds.indexOf(targetId)

    if (sourceIndex === -1 || targetIndex === -1) {
      return
    }

    const nextExerciseIds = [...exerciseIds]
    const [movedExerciseId] = nextExerciseIds.splice(sourceIndex, 1)

    if (!movedExerciseId) {
      return
    }

    nextExerciseIds.splice(targetIndex, 0, movedExerciseId)
    setExerciseIds(nextExerciseIds)
    formRef.current?.dispatchEvent(new CustomEvent(DRAFT_CHANGED_EVENT))
  }

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
                  <span className="admin-tag">#{index + 1}</span>
                  <span className="admin-exercise-summary-copy">
                    <strong>{exercise.name}</strong>
                    <small>
                      {exercise.category} · {exercise.equipment}
                    </small>
                  </span>
                  <span className="admin-exercise-summary-actions">
                    {needsReview ? <StatusPill tone="warning">Revisar</StatusPill> : null}
                    <span className="admin-exercise-toggle" aria-hidden="true">
                      <ChevronDownIcon size={16} />
                    </span>
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
                  <summary>
                    Ajustes avançados
                    <ChevronDownIcon size={14} />
                  </summary>
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
    </form>
  )
}
