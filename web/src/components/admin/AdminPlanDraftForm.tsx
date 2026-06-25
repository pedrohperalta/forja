'use client'

import type { MuscleCategory, Plan } from '@forja/domain'
import type { DragEvent, KeyboardEvent, ReactElement } from 'react'
import { useState } from 'react'

import { AdminCard, AdminField, StatusPill } from '@/components/admin/AdminUi'

type ServerAction = (formData: FormData) => Promise<void>

type AdminPlanDraftFormProps = {
  archived: boolean
  categoryOptions: readonly MuscleCategory[]
  draft: Plan
  planId: string
  saveDraftAction: ServerAction
}

export function AdminPlanDraftForm({
  archived,
  categoryOptions,
  draft,
  planId,
  saveDraftAction,
}: AdminPlanDraftFormProps): ReactElement {
  const [exerciseIds, setExerciseIds] = useState(() =>
    draft.exercises.map((exercise) => exercise.id),
  )
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState('')

  const orderedExercises = exerciseIds
    .map((exerciseId) => draft.exercises.find((exercise) => exercise.id === exerciseId))
    .filter((exercise): exercise is Plan['exercises'][number] => Boolean(exercise))

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
      setStatusMessage('Ordem alterada. Salve o rascunho para aplicar.')

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
    <form action={saveDraftAction} className="admin-plan-draft-form" encType="multipart/form-data">
      <input name="planId" type="hidden" value={planId} />
      <input name="exerciseOrder" type="hidden" value={exerciseIds.join(',')} />

      <section className="admin-section" aria-label="Dados do plano">
        <AdminCard accent>
          <div className="admin-form-heading">
            <div>
              <p className="admin-section-title">Rascunho estruturado</p>
              <p className="admin-muted">
                Edite dados e exercícios. Salve o rascunho antes de publicar no app.
              </p>
            </div>
            <button
              className="admin-primary-button admin-compact-button bg-accent"
              disabled={archived}
              type="submit"
            >
              Salvar rascunho
            </button>
          </div>
          {statusMessage ? (
            <p aria-live="polite" className="admin-save-status">
              {statusMessage}
            </p>
          ) : null}
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
            <AdminField label="Nome">
              <input
                className="admin-input"
                disabled={archived}
                name="name"
                required
                defaultValue={draft.name}
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
        {orderedExercises.map((exercise, index) => {
          const isDragging = draggingId === exercise.id
          const isDropTarget = dropTargetId === exercise.id

          return (
            <AdminCard
              key={exercise.id}
              className={`admin-exercise-card admin-draggable-exercise${
                isDragging ? ' is-dragging' : ''
              }${isDropTarget ? ' is-drop-target' : ''}`}
            >
              <details
                className="admin-exercise-editor"
                onDragOver={(event) => handleDragOver(event, exercise.id)}
                onDrop={(event) => handleDrop(event, exercise.id)}
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
                    <StatusPill>{exercise.category}</StatusPill>
                    <span className="admin-exercise-toggle" aria-hidden="true" />
                  </span>
                </summary>
                <input name="exerciseId" type="hidden" value={exercise.id} />
                <div className="admin-form-grid">
                  <AdminField label="Nome">
                    <input
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
              </details>
            </AdminCard>
          )
        })}
      </section>
    </form>
  )
}
