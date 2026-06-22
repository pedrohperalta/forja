'use client'

import { useRef, useState, type FormEvent, type ReactElement } from 'react'

import { AdminFileUpload, SUPPORTED_IMAGE_ACCEPT } from '@/components/admin/AdminFileUpload'
import { AdminCard, AdminField } from '@/components/admin/AdminUi'

type ImportWorkoutFormProps = {
  error?: string | undefined
  notice?: string | undefined
}

type ExtractedWorkout = {
  name: string
  exercises: Array<{
    name: string
    category: string
    sets: number
    reps: string
    restSeconds: number
    equipment: string
    confidence: number
  }>
}

type ExtractedWorkoutResult = {
  fileName: string
  workout: ExtractedWorkout
}

type ExtractWorkoutResponse = {
  workout?: ExtractedWorkout
  error?: {
    code?: string
    message?: string
  }
}

type CreateImportedPlanResponse = {
  planId?: string
  error?: {
    code?: string
    message?: string
  }
}

type ImportErrorMessage = {
  title: string
  description: string
}

export function AdminImportWorkoutForm({ error, notice }: ImportWorkoutFormProps): ReactElement {
  const formRef = useRef<HTMLFormElement>(null)
  const [status, setStatus] = useState<'idle' | 'extracting' | 'review'>('idle')
  const [workouts, setWorkouts] = useState<ExtractedWorkoutResult[]>([])
  const [clientError, setClientError] = useState<string | null>(null)
  const [isSavingPlan, setIsSavingPlan] = useState(false)
  const [isConfirmingReset, setIsConfirmingReset] = useState(false)
  const [extractProgress, setExtractProgress] = useState<{ current: number; total: number } | null>(
    null,
  )
  const [uploadKey, setUploadKey] = useState(0)
  const message = clientError
    ? { title: 'Não foi possível extrair', description: clientError }
    : getImportErrorMessage(error)
  const noticeMessage = getImportNoticeMessage(notice)
  const isExtracting = status === 'extracting'

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    const form = event.currentTarget
    const files = getSelectedImageFiles(form)
    const baseLabel = getFormString(form, 'label')

    setStatus('extracting')
    setWorkouts([])
    setClientError(null)
    setIsConfirmingReset(false)
    setExtractProgress({ current: 0, total: files.length })

    if (files.length === 0 || !baseLabel) {
      setStatus('idle')
      setExtractProgress(null)
      setClientError('Escolha pelo menos uma imagem e informe um nome para continuar.')
      return
    }

    try {
      const extracted: ExtractedWorkoutResult[] = []

      for (const [index, file] of files.entries()) {
        setExtractProgress({ current: index + 1, total: files.length })
        const response = await fetch('/api/admin/import/extract-workout', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
          },
          body: createExtractFormData({
            file,
            label: createBatchLabel(baseLabel, index, files.length),
          }),
        })
        const body = (await response.json()) as ExtractWorkoutResponse

        if (!response.ok) {
          setStatus('idle')
          setExtractProgress(null)
          setClientError(
            `${file.name}: ${getImportErrorDescription(body.error?.code, body.error?.message)}`,
          )
          return
        }

        if (!body.workout) {
          setStatus('idle')
          setExtractProgress(null)
          setClientError(`${file.name}: a IA respondeu sem uma ficha estruturada.`)
          return
        }

        extracted.push({ fileName: file.name, workout: body.workout })
      }

      setWorkouts(extracted)
      setExtractProgress(null)
      setStatus('review')
    } catch {
      setStatus('idle')
      setExtractProgress(null)
      setClientError('A conexão caiu durante a extração. Tente novamente em alguns segundos.')
    }
  }

  const handleReset = (): void => {
    formRef.current?.reset()
    setStatus('idle')
    setWorkouts([])
    setClientError(null)
    setIsSavingPlan(false)
    setIsConfirmingReset(false)
    setExtractProgress(null)
    setUploadKey((current) => current + 1)
  }

  const handleDiscardRequest = (): void => {
    if (isConfirmingReset) {
      handleReset()
      return
    }

    setIsConfirmingReset(true)
  }

  const handleSavePlan = async (): Promise<void> => {
    if (workouts.length === 0) {
      return
    }

    setIsSavingPlan(true)
    setClientError(null)

    try {
      const createdPlanIds: string[] = []

      for (const item of workouts) {
        const response = await fetch('/api/admin/import/create-plan', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ workout: item.workout }),
        })
        const body = (await response.json()) as CreateImportedPlanResponse

        if (!response.ok || !body.planId) {
          setClientError(getImportErrorDescription(body.error?.code, body.error?.message))
          setIsSavingPlan(false)
          return
        }

        createdPlanIds.push(body.planId)
      }

      window.location.assign(
        createdPlanIds.length === 1 ? `/admin/plans/${createdPlanIds[0]}` : '/admin/plans',
      )
    } catch {
      setClientError('Não foi possível salvar o rascunho agora. Tente novamente.')
      setIsSavingPlan(false)
    }
  }

  return (
    <div className="admin-linear-flow">
      <AdminCard accent className="admin-linear-panel">
        {message ? (
          <div className="admin-error-banner" role="alert">
            <strong>{message.title}</strong>
            <p>{message.description}</p>
          </div>
        ) : null}

        {noticeMessage ? (
          <div className="admin-notice-banner" role="status">
            <strong>{noticeMessage.title}</strong>
            <p>{noticeMessage.description}</p>
          </div>
        ) : null}

        <ol className="admin-stepper" aria-label="Etapas da importação">
          <li data-state={status === 'review' ? 'done' : 'active'}>
            <span>1</span>
            <strong>Enviar imagens</strong>
          </li>
          <li data-state={status === 'extracting' || status === 'review' ? 'active' : undefined}>
            <span>2</span>
            <strong>Revisar extração</strong>
          </li>
          <li>
            <span>3</span>
            <strong>Publicar no app</strong>
          </li>
        </ol>

        {workouts.length > 0 ? (
          <ImportWorkoutReview
            isConfirmingReset={isConfirmingReset}
            isSavingPlan={isSavingPlan}
            onDiscard={handleDiscardRequest}
            onSavePlan={() => {
              void handleSavePlan()
            }}
            workouts={workouts}
          />
        ) : null}

        {workouts.length > 0 ? null : (
          <form
            ref={formRef}
            aria-busy={isExtracting}
            className="admin-import-form"
            encType="multipart/form-data"
            onSubmit={(event) => {
              void handleSubmit(event)
            }}
          >
            <div className="admin-linear-section">
              <p className="admin-section-label">Etapa 1 de 3</p>
              <h2 className="admin-panel-title admin-display">Enviar imagens</h2>
              <p className="admin-muted">
                Escolha uma ou mais fotos nítidas. Cada imagem vira uma ficha para revisar antes de
                salvar qualquer alteração.
              </p>
            </div>

            <div className="admin-linear-fields">
              <div className="admin-field">
                <span>Imagens da ficha</span>
                <AdminFileUpload
                  key={uploadKey}
                  accept={SUPPORTED_IMAGE_ACCEPT}
                  id="image"
                  multiple
                  name="image"
                  required
                />
              </div>
              <AdminField label="Nome da ficha">
                <input
                  className="admin-input"
                  id="label"
                  name="label"
                  placeholder="Treino A"
                  required
                  type="text"
                />
              </AdminField>
            </div>

            <div className="admin-live-status" aria-live="polite" role="status">
              {isExtracting
                ? getExtractingLabel(extractProgress)
                : 'Extraindo com IA quando você continuar.'}
            </div>

            <div className="admin-linear-footer">
              <p>
                Nada será publicado automaticamente. A extração cria uma revisão para conferência.
              </p>
              <button
                className="admin-primary-button bg-accent"
                disabled={isExtracting}
                type="submit"
              >
                {isExtracting ? (
                  <>
                    <span className="admin-button-spinner" aria-hidden="true" />
                    Extraindo com IA...
                  </>
                ) : (
                  'Continuar para extração'
                )}
              </button>
            </div>
          </form>
        )}
      </AdminCard>
    </div>
  )
}

function ImportWorkoutReview({
  isConfirmingReset,
  isSavingPlan,
  onDiscard,
  onSavePlan,
  workouts,
}: {
  isConfirmingReset: boolean
  isSavingPlan: boolean
  onDiscard: () => void
  onSavePlan: () => void
  workouts: ExtractedWorkoutResult[]
}): ReactElement {
  const totalExercises = workouts.reduce((sum, item) => sum + item.workout.exercises.length, 0)

  return (
    <section className="admin-import-review" aria-labelledby="import-review-title">
      <div className="admin-linear-section">
        <p className="admin-section-label">Etapa 2 de 3</p>
        <h2 className="admin-panel-title admin-display" id="import-review-title">
          Extração concluída
        </h2>
        <p className="admin-muted">
          A resposta da IA foi convertida em rascunhos estruturados. Confira antes de salvar e
          publicar no app.
        </p>
      </div>

      <div className="admin-import-review-header">
        <div>
          <span>{workouts.length === 1 ? 'Ficha extraída' : 'Fichas extraídas'}</span>
          <strong>
            {workouts.length === 1
              ? workouts[0]?.workout.name
              : `${workouts.length} fichas extraídas`}
          </strong>
        </div>
        <div>
          <span>Exercícios</span>
          <strong>{totalExercises}</strong>
        </div>
      </div>

      <div className="admin-unsaved-banner" role="status">
        <strong>Ainda não salvo</strong>
        <p>
          Esta extração só existe nesta tela. Salve o rascunho antes de sair ou descarte com
          confirmação.
        </p>
      </div>

      <div className="admin-import-review-list">
        {workouts.map((item, workoutIndex) => (
          <section className="admin-import-workout-group" key={`${item.fileName}-${workoutIndex}`}>
            <div className="admin-import-workout-heading">
              <span>{item.fileName}</span>
              <strong>{item.workout.name}</strong>
            </div>
            {item.workout.exercises.map((exercise, exerciseIndex) => (
              <article
                className="admin-import-exercise"
                key={`${item.fileName}-${exercise.name}-${exerciseIndex}`}
              >
                <div>
                  <span className="admin-import-exercise-index">{exerciseIndex + 1}</span>
                </div>
                <div className="admin-import-exercise-copy">
                  <h3>{exercise.name}</h3>
                  <p>
                    {exercise.category} · {exercise.equipment}
                  </p>
                  <div className="admin-import-exercise-meta">
                    <span>{exercise.sets} séries</span>
                    <span>{exercise.reps} reps</span>
                    <span>{exercise.restSeconds}s descanso</span>
                    <span>{Math.round(exercise.confidence * 100)}% confiança</span>
                  </div>
                </div>
              </article>
            ))}
          </section>
        ))}
      </div>

      <div className="admin-linear-footer">
        <p>
          Próximo passo: salve como rascunho para abrir o editor estruturado. A publicação no app
          acontece só depois da revisão.
        </p>
        <div className="admin-actions-row admin-actions-row-tight">
          <button
            className={isConfirmingReset ? 'admin-danger-button' : 'admin-secondary-button'}
            disabled={isSavingPlan}
            onClick={onDiscard}
            type="button"
          >
            {isConfirmingReset ? 'Confirmar descarte' : 'Descartar extração'}
          </button>
          <button
            className="admin-primary-button bg-accent"
            disabled={isSavingPlan}
            onClick={onSavePlan}
            type="button"
          >
            {isSavingPlan ? (
              <>
                <span className="admin-button-spinner" aria-hidden="true" />
                Salvando rascunhos...
              </>
            ) : (
              getSaveButtonLabel(workouts.length)
            )}
          </button>
        </div>
      </div>
    </section>
  )
}

function getSelectedImageFiles(form: HTMLFormElement): File[] {
  const input = form.elements.namedItem('image')

  if (!(input instanceof HTMLInputElement)) {
    return []
  }

  return Array.from(input.files ?? [])
}

function getFormString(form: HTMLFormElement, name: string): string {
  const input = form.elements.namedItem(name)

  return input instanceof HTMLInputElement ? input.value.trim() : ''
}

function createExtractFormData(input: { file: File; label: string }): FormData {
  const formData = new FormData()
  formData.set('image', input.file)
  formData.set('label', input.label)

  return formData
}

function createBatchLabel(baseLabel: string, index: number, total: number): string {
  return total === 1 ? baseLabel : `${baseLabel} ${index + 1}`
}

function getExtractingLabel(progress: { current: number; total: number } | null): string {
  if (!progress || progress.total <= 1) {
    return 'Enviando imagem para a IA. Isso pode levar alguns segundos.'
  }

  return `Extraindo imagem ${progress.current} de ${progress.total}. Isso pode levar alguns segundos.`
}

function getSaveButtonLabel(workoutCount: number): string {
  return workoutCount === 1 ? 'Salvar rascunho e revisar' : `Salvar ${workoutCount} rascunhos`
}

export function getImportErrorMessage(error: string | undefined): ImportErrorMessage | null {
  if (error === 'upload_too_large') {
    return {
      title: 'Imagem muito grande',
      description:
        'Tentamos otimizar a imagem, mas ela ainda passou de 5 MB. Recorte ou exporte em JPG e tente novamente.',
    }
  }

  if (error === 'unsupported_media_type') {
    return {
      title: 'Formato não suportado',
      description: 'Envie JPG, PNG, WebP ou um HEIC que o navegador consiga converter.',
    }
  }

  if (error) {
    return {
      title: 'Não foi possível importar',
      description: 'Revise a imagem e tente novamente.',
    }
  }

  return null
}

function getImportNoticeMessage(notice: string | undefined): ImportErrorMessage | null {
  if (notice === 'extraction_finished') {
    return {
      title: 'Extração concluída',
      description:
        'Voltamos para o importador para evitar mostrar JSON cru. Use o botão da tela para ver a revisão estruturada aqui mesmo.',
    }
  }

  return null
}

function getImportErrorDescription(code: string | undefined, fallback: string | undefined): string {
  if (code === 'upload_too_large') {
    return 'Tentamos otimizar a imagem, mas ela ainda passou de 5 MB. Recorte ou exporte em JPG e tente novamente.'
  }

  if (code === 'unsupported_media_type') {
    return 'Envie JPG, PNG, WebP ou um HEIC que o navegador consiga converter.'
  }

  if (code === 'model_output_invalid') {
    return 'A IA não conseguiu transformar essa imagem em uma ficha confiável. Tente uma foto mais nítida.'
  }

  return fallback ?? 'Revise a imagem e tente novamente.'
}
