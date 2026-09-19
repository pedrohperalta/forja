// @vitest-environment jsdom

import { act, createElement, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'

import {
  AdminFileUpload,
  getSelectedFileState,
  shouldAttemptLocalCompression,
  SUPPORTED_IMAGE_ACCEPT,
} from './AdminFileUpload'

describe('AdminFileUpload accumulation', () => {
  let container: HTMLDivElement
  let root: Root

  afterEach(() => {
    act(() => {
      root?.unmount()
    })
    container?.remove()
  })

  it('accumulates files across consecutive picks in multiple mode', () => {
    const selections: File[][] = []
    renderMultiple((files) => selections.push(files))
    const input = getRequiredInput()

    pickFiles(input, [createImageFile('a.jpg')])
    expect(container.textContent).toContain('1 imagem selecionada')

    pickFiles(input, [createImageFile('b.jpg')])
    expect(container.textContent).toContain('2 imagens selecionadas')
    expect(selections.at(-1)?.map((file) => file.name)).toEqual(['a.jpg', 'b.jpg'])
    expect(container.textContent).toContain('Adicionar mais')
    expect(container.textContent).toContain('a.jpg')
    expect(container.textContent).toContain('b.jpg')
  })

  it('does not duplicate a file that is picked again', () => {
    const selections: File[][] = []
    renderMultiple((files) => selections.push(files))
    const input = getRequiredInput()

    pickFiles(input, [createImageFile('a.jpg', 1_700_000_000_000)])
    pickFiles(input, [createImageFile('a.jpg', 1_700_000_000_000)])

    expect(container.textContent).toContain('1 imagem selecionada')
    expect(selections.at(-1)).toHaveLength(1)
  })

  it('lets the admin remove an accumulated file from its chip', () => {
    const selections: File[][] = []
    renderMultiple((files) => selections.push(files))
    const input = getRequiredInput()

    pickFiles(input, [createImageFile('a.jpg'), createImageFile('b.jpg')])

    const removeButton = Array.from(container.querySelectorAll('button')).find(
      (candidate) => candidate.getAttribute('aria-label') === 'Remover a.jpg',
    )

    expect(removeButton).toBeDefined()

    act(() => {
      removeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    })

    expect(container.textContent).toContain('1 imagem selecionada')
    expect(selections.at(-1)?.map((file) => file.name)).toEqual(['b.jpg'])
    expect(container.textContent).not.toContain('a.jpg')
  })

  it('keeps the selection when the picker is cancelled with no new files', () => {
    const selections: File[][] = []
    renderMultiple((files) => selections.push(files))
    const input = getRequiredInput()

    pickFiles(input, [createImageFile('a.jpg')])
    pickFiles(input, [])

    expect(container.textContent).toContain('1 imagem selecionada')
    expect(selections).toHaveLength(1)
  })

  function renderMultiple(onSelectionChange: (files: File[]) => void): void {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    act(() => {
      root.render(
        createElement(AdminFileUpload, {
          id: 'image',
          multiple: true,
          name: 'image',
          onSelectionChange,
        }) satisfies ReactElement,
      )
    })
  }

  function getRequiredInput(): HTMLInputElement {
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')

    if (!input) {
      throw new Error('Missing file input')
    }

    return input
  }

  function pickFiles(input: HTMLInputElement, files: File[]): void {
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: files,
    })

    act(() => {
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })
  }

  function createImageFile(name: string, lastModified?: number): File {
    return new File(['image-bytes'], name, {
      type: 'image/jpeg',
      ...(lastModified !== undefined ? { lastModified } : {}),
    })
  }
})

describe('AdminFileUpload', () => {
  it('renders a styled file picker instead of exposing the native input as the visible control', () => {
    const markup = renderToStaticMarkup(
      createElement(AdminFileUpload, {
        id: 'workout-image',
        maxBytes: 5_242_880,
        name: 'image',
        required: true,
      }),
    )

    expect(markup).toContain('Selecionar imagem')
    expect(markup).toContain('JPG, PNG, WebP ou HEIC')
    expect(markup).toContain('Otimizamos imagens grandes antes do envio.')
    expect(markup).toContain('Escolher arquivo')
    expect(markup).toContain(`accept="${SUPPORTED_IMAGE_ACCEPT}"`)
    expect(markup).toContain('class="admin-file-input"')
    expect(markup).toContain('data-max-bytes="5242880"')
    expect(markup).toContain('aria-describedby="workout-image-selected workout-image-error"')
    expect(markup).toContain('id="workout-image-selected"')
    expect(markup).toContain('aria-live="polite"')
    expect(markup).not.toContain('Choose File')
    expect(markup).not.toContain('No file chosen')
  })

  it('supports a custom maximum file size hint', () => {
    const markup = renderToStaticMarkup(
      createElement(AdminFileUpload, {
        id: 'workout-image',
        maxBytes: 1_048_576,
        name: 'image',
      }),
    )

    expect(markup).toContain('Até 1MB')
    expect(markup).toContain('data-max-bytes="1048576"')
  })

  it('can render a multiple-image picker for batch imports', () => {
    const markup = renderToStaticMarkup(
      createElement(AdminFileUpload, {
        id: 'workout-images',
        multiple: true,
        name: 'image',
      }),
    )

    expect(markup).toContain('Selecionar imagens')
    expect(markup).toContain('Escolher arquivos')
    expect(markup).toContain('Nenhuma imagem selecionada')
    expect(markup).toContain('multiple=""')
  })

  it('describes selected and oversized files for the upload state', () => {
    const selected = getSelectedFileState(
      { name: 'treino.jpg', size: 1_572_864, type: 'image/jpeg' },
      5_242_880,
    )
    const oversizedHeic = getSelectedFileState(
      { name: 'foto.heic', size: 6_291_456, type: 'image/heic' },
      5_242_880,
    )
    const unsupported = getSelectedFileState(
      { name: 'documento.pdf', size: 1_000, type: 'application/pdf' },
      5_242_880,
    )

    expect(selected).toEqual({
      error: null,
      fileName: 'treino.jpg',
      fileSize: '1.5MB',
      helper: 'Imagem pronta para envio.',
    })
    expect(oversizedHeic).toEqual({
      error: null,
      fileName: 'foto.heic',
      fileSize: '6MB',
      helper: 'Vamos converter para JPG antes de enviar.',
    })
    expect(unsupported.error).toContain('Envie uma imagem em JPG, PNG, WebP, GIF ou HEIC/HEIF.')
  })

  it('allows large compressible images to be optimized before upload', () => {
    const largeJpeg = getSelectedFileState(
      { name: 'pesado.jpg', size: 6_291_456, type: 'image/jpeg' },
      5_242_880,
    )

    expect(largeJpeg).toEqual({
      error: null,
      fileName: 'pesado.jpg',
      fileSize: '6MB',
      helper: 'Imagem grande. Vamos otimizar antes de enviar.',
    })
    expect(
      shouldAttemptLocalCompression(
        { name: 'pesado.jpg', size: 6_291_456, type: 'image/jpeg' },
        5_242_880,
      ),
    ).toBe(true)
    expect(
      shouldAttemptLocalCompression(
        { name: 'foto.heic', size: 6_291_456, type: 'image/heic' },
        5_242_880,
      ),
    ).toBe(true)
    expect(
      shouldAttemptLocalCompression(
        { name: 'animacao.gif', size: 6_291_456, type: 'image/gif' },
        5_242_880,
      ),
    ).toBe(false)
  })
})
