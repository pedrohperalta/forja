import { describe, expect, it } from 'vitest'

import {
  getPublicationState,
  getPublicationStatus,
  type PublicationState,
} from './publicationState'

const plan = {
  id: 'plan_a',
  label: 'A',
  name: 'Treino A',
  focus: 'Peito',
  exercises: [],
  createdAt: '2026-05-18T12:00:00.000Z',
  updatedAt: '2026-05-18T12:00:00.000Z',
}

describe('getPublicationState', () => {
  it('marks plans without a published revision as unpublished drafts', () => {
    expect(
      getPublicationState({ archived: false, draftData: plan, latestRevisionData: null }),
    ).toBe('unpublished-draft')
  })

  it('marks plans whose draft matches the latest revision as published', () => {
    expect(
      getPublicationState({ archived: false, draftData: plan, latestRevisionData: plan }),
    ).toBe('published')
  })

  it('ignores key order when comparing draft and revision', () => {
    const reordered = {
      focus: plan.focus,
      name: plan.name,
      label: plan.label,
      id: plan.id,
      exercises: [],
      updatedAt: plan.updatedAt,
      createdAt: plan.createdAt,
    }

    expect(
      getPublicationState({ archived: false, draftData: reordered, latestRevisionData: plan }),
    ).toBe('published')
  })

  it('marks plans with draft edits as pending changes', () => {
    const edited = { ...plan, focus: 'Costas' }

    expect(
      getPublicationState({ archived: false, draftData: edited, latestRevisionData: plan }),
    ).toBe('pending-changes')
  })

  it('treats missing drafts with published revisions as published', () => {
    expect(
      getPublicationState({ archived: false, draftData: null, latestRevisionData: plan }),
    ).toBe('published')
  })

  it('gives archived precedence over any other state', () => {
    expect(
      getPublicationState({ archived: true, draftData: plan, latestRevisionData: null }),
    ).toBe('archived')
  })
})

describe('getPublicationStatus', () => {
  const states: PublicationState[] = [
    'unpublished-draft',
    'published',
    'pending-changes',
    'archived',
  ]

  it('uses one shared vocabulary across surfaces without leaking "draft"', () => {
    for (const state of states) {
      const status = getPublicationStatus(state)

      expect(status.label.toLowerCase()).not.toContain('draft')
    }
  })

  it('labels each state with the agreed pt-BR vocabulary', () => {
    expect(getPublicationStatus('unpublished-draft').label).toBe('Rascunho')
    expect(getPublicationStatus('published').label).toBe('Publicado no app')
    expect(getPublicationStatus('pending-changes').label).toBe('Publicado com alterações')
    expect(getPublicationStatus('archived').label).toBe('Arquivado')
  })

  it('only allows publishing from unpublished drafts and pending changes', () => {
    expect(getPublicationStatus('unpublished-draft').canPublish).toBe(true)
    expect(getPublicationStatus('pending-changes').canPublish).toBe(true)
    expect(getPublicationStatus('published').canPublish).toBe(false)
    expect(getPublicationStatus('archived').canPublish).toBe(false)
  })

  it('keeps warning tone for pending work and accent for synced plans', () => {
    expect(getPublicationStatus('unpublished-draft').tone).toBe('warning')
    expect(getPublicationStatus('pending-changes').tone).toBe('warning')
    expect(getPublicationStatus('published').tone).toBe('accent')
    expect(getPublicationStatus('archived').tone).toBe('danger')
  })
})
