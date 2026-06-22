import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import {
  AdminFileUpload,
  getSelectedFileState,
  shouldAttemptLocalCompression,
  SUPPORTED_IMAGE_ACCEPT,
} from './AdminFileUpload'

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
