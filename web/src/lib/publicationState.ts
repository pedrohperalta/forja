import type { Plan } from '@forja/domain'

export type PublicationState = 'unpublished-draft' | 'published' | 'pending-changes' | 'archived'

export type PublicationStatus = {
  label: string
  description: string
  publishDescription: string
  publishLabel: string
  canPublish: boolean
  tone: 'accent' | 'warning' | 'danger'
}

export function getPublicationState(input: {
  archived: boolean
  draftData: Plan | null
  latestRevisionData: Plan | null
}): PublicationState {
  if (input.archived) {
    return 'archived'
  }

  if (!input.latestRevisionData) {
    return 'unpublished-draft'
  }

  if (!input.draftData) {
    return 'published'
  }

  if (stableStringify(input.draftData) === stableStringify(input.latestRevisionData)) {
    return 'published'
  }

  return 'pending-changes'
}

export function getPublicationStatus(state: PublicationState): PublicationStatus {
  if (state === 'archived') {
    return {
      label: 'Arquivado',
      description: 'Não aparece no app.',
      publishDescription: 'Plano arquivado. Não aparece no app e não pode ser editado.',
      publishLabel: 'Plano arquivado',
      canPublish: false,
      tone: 'danger',
    }
  }

  if (state === 'published') {
    return {
      label: 'Publicado no app',
      description: 'Esta versão já está publicada no app.',
      publishDescription:
        'Esta versão já está publicada no app. Edite algum campo para criar uma nova revisão.',
      publishLabel: 'Publicado',
      canPublish: false,
      tone: 'accent',
    }
  }

  if (state === 'pending-changes') {
    return {
      label: 'Publicado com alterações',
      description: 'A versão no app é anterior; suas edições ainda não foram publicadas.',
      publishDescription:
        'Publique a revisão para atualizar o app. Até lá, as edições ficam salvas no rascunho.',
      publishLabel: 'Publicar revisão',
      canPublish: true,
      tone: 'warning',
    }
  }

  return {
    label: 'Rascunho',
    description: 'Não aparece no app.',
    publishDescription:
      'Publique para o plano aparecer no app. Até lá, tudo fica salvo no rascunho.',
    publishLabel: 'Publicar no app',
    canPublish: true,
    tone: 'warning',
  }
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(',')}}`
  }

  return JSON.stringify(value)
}
