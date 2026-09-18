'use client'

import { useRef, useState, type FormEvent, type ReactElement } from 'react'

import { AdminFileUpload, SUPPORTED_IMAGE_ACCEPT } from '@/components/admin/AdminFileUpload'
import { AdminCard } from '@/components/admin/AdminUi'

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
  const abortControllerRef = useRef<AbortController | null>(null)
  const [isWorking, setIsWorking] = useState(false)
  const [clientError, setClientError] = useState<ImportErrorMessage | null>(null)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const message = clientError ?? getImportErrorMessage(error)
  const noticeMessage = getImportNoticeMessage(notice)

  const handleCancel = (): void => {
    abortControllerRef.current?.abort()
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    const form = event.currentTarget
    const files = getSelectedImageFiles(form)

    if (files.length === 0) {
      setClientError({
        title: 'Nenhuma imagem selecionada',
        description: 'Escolha pelo menos uma imagem para continuar.',
      })
      return
    }

    const controller = new AbortController()
    abortControllerRef.current = controller
    const createdPlanIds: string[] = []
    setIsWorking(true)
    setClientError(null)
    setProgress({ current: 0, total: files.length })

    try {
      for (const [index, file] of files.entries()) {
        setProgress({ current: index + 1, total: files.length })

        const workout = await extractWorkout(file, controller.signal)

        assertNotAborted(controller)

        const planId = await createDraftFromWorkout(workout, controller.signal)

        createdPlanIds.push(planId)

        assertNotAborted(controller)
      }

      window.location.assign(
        createdPlanIds.length === 1
          ? `/admin/plans/${createdPlanIds[0]}`
          : `/admin/plans?imported=${createdPlanIds.length}`,
      )
    } catch (caught) {
      setIsWorking(false)
      setProgress(null)
      abortControllerRef.current = null

      const createdCount = createdPlanIds.length

      if (controller.signal.aborted) {
        setClientError(getCancelledMessage(createdCount, files.length))
        return
      }

      if (createdCount > 0) {
        setClientError(getPartialFailureMessage(createdCount, files.length, caught))
        return
      }

      setClientError({
        title: 'Não foi possível extrair',
        description:
          caught instanceof Error
            ? caught.message
            : 'A conexão caiu durante a extração. Tente novamente em alguns segundos.',
      })
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

        <form
          ref={formRef}
          aria-busy={isWorking}
          className="admin-import-form"
          encType="multipart/form-data"
          onSubmit={(event) => {
            void handleSubmit(event)
          }}
        >
          <div className="admin-linear-section">
            <p className="admin-section-label">Enviar fotos</p>
            <h2 className="admin-panel-title admin-display">Foto vira ficha</h2>
            <p className="admin-muted">
              Cada foto vira uma ficha separada. Pode enviar todas de uma vez — a IA extrai, cria os
              rascunhos e você confere tudo no editor.
            </p>
          </div>

          <div className="admin-linear-fields">
            <div className="admin-field">
              <span>Imagens da ficha</span>
              <AdminFileUpload
                accept={SUPPORTED_IMAGE_ACCEPT}
                id="image"
                multiple
                name="image"
                required
              />
            </div>
          </div>

          <div className="admin-live-status" aria-live="polite" role="status">
            {isWorking
              ? getWorkingLabel(progress)
              : 'A IA extrai cada foto e cria um rascunho para você conferir no editor.'}
          </div>

          <div className="admin-linear-footer">
            <p>
              Rascunhos não aparecem no app. Exercícios com extração incerta chegam marcados com
              "Revisar".
            </p>
            <div className="admin-actions-row admin-actions-row-tight">
              {isWorking ? (
                <button className="admin-secondary-button" onClick={handleCancel} type="button">
                  Cancelar
                </button>
              ) : null}
              <button
                className="admin-primary-button"
                disabled={isWorking}
                type="submit"
              >
                {isWorking ? (
                  <>
                    <span className="admin-button-spinner" aria-hidden="true" />
                    Extraindo com IA...
                  </>
                ) : (
                  'Extrair e criar rascunhos'
                )}
              </button>
            </div>
          </div>
        </form>
      </AdminCard>
    </div>
  )
}

async function extractWorkout(file: File, signal?: AbortSignal): Promise<ExtractedWorkout> {
  const response = await fetch('/api/admin/import/extract-workout', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
    body: createExtractFormData(file),
    ...(signal ? { signal } : {}),
  })
  const body = (await response.json()) as ExtractWorkoutResponse

  if (!response.ok) {
    throw new Error(
      `${file.name}: ${getImportErrorDescription(body.error?.code, body.error?.message)}`,
    )
  }

  if (!body.workout) {
    throw new Error(`${file.name}: a IA respondeu sem uma ficha estruturada.`)
  }

  return body.workout
}

async function createDraftFromWorkout(
  workout: ExtractedWorkout,
  signal?: AbortSignal,
): Promise<string> {
  const response = await fetch('/api/admin/import/create-plan', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ workout }),
    ...(signal ? { signal } : {}),
  })
  const body = (await response.json()) as CreateImportedPlanResponse

  if (!response.ok || !body.planId) {
    throw new Error(getImportErrorDescription(body.error?.code, body.error?.message))
  }

  return body.planId
}

function getSelectedImageFiles(form: HTMLFormElement): File[] {
  const input = form.elements.namedItem('image')

  if (!(input instanceof HTMLInputElement)) {
    return []
  }

  return Array.from(input.files ?? [])
}

function createExtractFormData(file: File): FormData {
  const formData = new FormData()
  formData.set('image', file)
  formData.set('label', createFileLabel(file.name))

  return formData
}

function createFileLabel(fileName: string): string {
  const withoutExtension = fileName.replace(/\.[^.]+$/, '')

  return withoutExtension.trim() || fileName
}

function getWorkingLabel(progress: { current: number; total: number } | null): string {
  if (!progress || progress.total <= 1) {
    return 'Extraindo com IA. Isso pode levar alguns segundos.'
  }

  return `Extraindo imagem ${progress.current} de ${progress.total}. Cada foto vira uma ficha — pode levar alguns segundos.`
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
        'Os rascunhos foram criados a partir das fotos. Abra cada um para revisar e publicar.',
    }
  }

  return null
}

function assertNotAborted(controller: AbortController): void {
  if (controller.signal.aborted) {
    const abortError = new Error('Import cancelled')
    abortError.name = 'AbortError'

    throw abortError
  }
}

function getCancelledMessage(createdCount: number, totalCount: number): ImportErrorMessage {
  if (createdCount === 0) {
    return {
      title: 'Importação cancelada',
      description: 'Nenhuma ficha foi criada. Envie as fotos novamente quando quiser.',
    }
  }

  return {
    title: 'Importação cancelada',
    description: `${createdCount} de ${totalCount} fichas foram criadas e já estão na lista de planos. Reenvie as fotos restantes quando quiser.`,
  }
}

function getPartialFailureMessage(
  createdCount: number,
  totalCount: number,
  caught: unknown,
): ImportErrorMessage {
  const cause =
    caught instanceof Error
      ? caught.message
      : 'A conexão caiu durante a extração. Tente novamente em alguns segundos.'

  return {
    title: 'Fichas parcialmente criadas',
    description: `${createdCount} de ${totalCount} fichas foram criadas e já estão na lista de planos. ${cause} Reenvie as fotos restantes quando quiser.`,
  }
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
