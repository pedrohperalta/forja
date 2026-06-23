'use client'

import { useEffect, useState, type ChangeEvent, type ReactElement } from 'react'

export const SUPPORTED_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,.heic,.heif'

const COMPRESSED_IMAGE_TYPE = 'image/jpeg'
const MAX_IMAGE_DIMENSION = 1800
const COMPRESSIBLE_MEDIA_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const CONVERTIBLE_MEDIA_TYPES = new Set(['image/heic', 'image/heif'])

type AdminFileUploadProps = {
  accept?: string
  id: string
  maxBytes?: number
  multiple?: boolean
  name: string
  required?: boolean
}

export function AdminFileUpload({
  accept = SUPPORTED_IMAGE_ACCEPT,
  id,
  maxBytes = 5 * 1024 * 1024,
  multiple = false,
  name,
  required = false,
}: AdminFileUploadProps): ReactElement {
  const [fileName, setFileName] = useState('Nenhuma imagem selecionada')
  const [fileSize, setFileSize] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [helper, setHelper] = useState<string | null>('Otimizamos imagens grandes antes do envio.')
  const [error, setError] = useState<string | null>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    void updateSelectedFile(event.currentTarget)
  }

  const updateSelectedFile = async (input: HTMLInputElement): Promise<void> => {
    const files = Array.from(input.files ?? [])
    const file = files[0]
    const selected = multiple
      ? getSelectedFilesState(files, maxBytes)
      : getSelectedFileState(file, maxBytes)

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }

    if (!file) {
      setError(selected.error)
      setFileName(selected.fileName)
      setFileSize(selected.fileSize)
      setHelper(selected.helper)
      return
    }

    if (selected.error) {
      input.value = ''
      setError(selected.error)
      setFileName(selected.fileName)
      setFileSize(selected.fileSize)
      setHelper(selected.helper)
      return
    }

    setFileName(selected.fileName)
    setFileSize(selected.fileSize)
    setHelper(selected.helper)
    setError(null)

    const filesToOptimize = multiple ? files : [file]
    const shouldOptimize = filesToOptimize.some((candidate) =>
      shouldAttemptLocalCompression(candidate, maxBytes),
    )

    if (shouldOptimize) {
      setIsOptimizing(true)
      setHelper(
        multiple ? 'Otimizando imagens no navegador...' : 'Otimizando imagem no navegador...',
      )

      try {
        const optimizedFiles = await Promise.all(
          filesToOptimize.map((candidate) =>
            shouldAttemptLocalCompression(candidate, maxBytes)
              ? optimizeImageFile(candidate, maxBytes)
              : Promise.resolve(candidate),
          ),
        )

        if (optimizedFiles.some((candidate) => candidate.size > maxBytes)) {
          input.value = ''
          setFileName('Nenhuma imagem selecionada')
          setFileSize(null)
          setPreviewUrl(null)
          setHelper(null)
          setError('Tentamos otimizar, mas pelo menos uma imagem ainda passou de 5MB.')
          return
        }

        replaceInputFiles(input, optimizedFiles)
        const optimizedSelected = multiple
          ? getSelectedFilesState(optimizedFiles, maxBytes)
          : getSelectedFileState(optimizedFiles[0], maxBytes)
        setFileName(optimizedSelected.fileName)
        setFileSize(optimizedSelected.fileSize)
        setHelper(
          multiple
            ? 'Imagens otimizadas e prontas para envio.'
            : 'Imagem otimizada e pronta para envio.',
        )
        setPreviewUrl(URL.createObjectURL(optimizedFiles[0] ?? file))
      } catch {
        input.value = ''
        setFileName('Nenhuma imagem selecionada')
        setFileSize(null)
        setPreviewUrl(null)
        setHelper(null)
        setError(
          'Não foi possível otimizar esta imagem no navegador. Exporte como JPG ou PNG e tente novamente.',
        )
      } finally {
        setIsOptimizing(false)
      }

      return
    }

    setPreviewUrl(URL.createObjectURL(file))
  }

  return (
    <>
      <label className="admin-file-upload" htmlFor={id} data-invalid={error ? true : undefined}>
        <span className="admin-file-upload-icon" aria-hidden="true">
          +
        </span>
        <span className="admin-file-upload-copy">
          <strong>{multiple ? 'Selecionar imagens' : 'Selecionar imagem'}</strong>
          <small>JPG, PNG, WebP ou HEIC · Até {formatMegabytes(maxBytes)}</small>
        </span>
        <span className="admin-file-upload-action">
          {isOptimizing
            ? 'Otimizando...'
            : previewUrl
              ? multiple
                ? 'Trocar imagens'
                : 'Trocar imagem'
              : multiple
                ? 'Escolher arquivos'
                : 'Escolher arquivo'}
        </span>
      </label>
      <input
        accept={accept}
        className="admin-file-input"
        data-max-bytes={maxBytes}
        aria-describedby={`${id}-selected ${id}-error`}
        id={id}
        multiple={multiple}
        name={name}
        onChange={handleChange}
        required={required}
        type="file"
      />
      <p className="admin-file-selected" aria-live="polite" id={`${id}-selected`}>
        {fileName}
        {fileSize ? <span>{fileSize}</span> : null}
      </p>
      {helper ? <p className="admin-file-helper">{helper}</p> : null}
      {previewUrl ? (
        <div className="admin-file-preview">
          {/* eslint-disable-next-line @next/next/no-img-element -- preview renders a local object URL that next/image cannot optimize */}
          <img alt="Prévia da imagem selecionada" src={previewUrl} />
          <span>Prévia carregada</span>
        </div>
      ) : null}
      {error ? (
        <p className="admin-field-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </>
  )
}

type SelectedFileLike = {
  name: string
  size: number
  type?: string
}

export function getSelectedFileState(
  file: SelectedFileLike | null | undefined,
  maxBytes: number,
): { error: string | null; fileName: string; fileSize: string | null; helper: string | null } {
  if (!file) {
    return {
      error: null,
      fileName: 'Nenhuma imagem selecionada',
      fileSize: null,
      helper: 'Otimizamos imagens grandes antes do envio.',
    }
  }

  if (!isSupportedUploadImage(file)) {
    return {
      error: 'Envie uma imagem em JPG, PNG, WebP, GIF ou HEIC/HEIF.',
      fileName: 'Nenhuma imagem selecionada',
      fileSize: null,
      helper: null,
    }
  }

  if (file.size > maxBytes && !shouldAttemptLocalCompression(file, maxBytes)) {
    return {
      error: `Escolha uma imagem de até ${formatMegabytes(maxBytes)}.`,
      fileName: 'Nenhuma imagem selecionada',
      fileSize: null,
      helper: null,
    }
  }

  return {
    error: null,
    fileName: file.name,
    fileSize: formatMegabytes(file.size),
    helper: shouldAttemptLocalCompression(file, maxBytes)
      ? getNormalizedImageType(file) === 'image/heic' ||
        getNormalizedImageType(file) === 'image/heif'
        ? 'Vamos converter para JPG antes de enviar.'
        : 'Imagem grande. Vamos otimizar antes de enviar.'
      : 'Imagem pronta para envio.',
  }
}

export function getSelectedFilesState(
  files: SelectedFileLike[],
  maxBytes: number,
): { error: string | null; fileName: string; fileSize: string | null; helper: string | null } {
  if (files.length === 0) {
    return getSelectedFileState(null, maxBytes)
  }

  const invalidFile = files.find((file) => !isSupportedUploadImage(file))
  if (invalidFile) {
    return getSelectedFileState(invalidFile, maxBytes)
  }

  const blockedFile = files.find(
    (file) => file.size > maxBytes && !shouldAttemptLocalCompression(file, maxBytes),
  )
  if (blockedFile) {
    return getSelectedFileState(blockedFile, maxBytes)
  }

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0)
  const needsOptimization = files.some((file) => shouldAttemptLocalCompression(file, maxBytes))

  return {
    error: null,
    fileName: `${files.length} imagens selecionadas`,
    fileSize: formatMegabytes(totalBytes),
    helper: needsOptimization
      ? 'Algumas imagens serão otimizadas antes do envio.'
      : 'Imagens prontas para envio.',
  }
}

export function shouldAttemptLocalCompression(file: SelectedFileLike, maxBytes: number): boolean {
  const imageType = getNormalizedImageType(file)

  if (imageType && CONVERTIBLE_MEDIA_TYPES.has(imageType)) {
    return true
  }

  return file.size > maxBytes && imageType !== null && COMPRESSIBLE_MEDIA_TYPES.has(imageType)
}

function isSupportedUploadImage(file: SelectedFileLike): boolean {
  const imageType = getNormalizedImageType(file)

  return (
    imageType !== null &&
    (COMPRESSIBLE_MEDIA_TYPES.has(imageType) ||
      CONVERTIBLE_MEDIA_TYPES.has(imageType) ||
      imageType === 'image/gif')
  )
}

function getNormalizedImageType(file: SelectedFileLike): string | null {
  const type = file.type?.toLowerCase() ?? ''

  if (type === 'image/jpg') {
    return 'image/jpeg'
  }

  if (
    type === 'image/jpeg' ||
    type === 'image/png' ||
    type === 'image/webp' ||
    type === 'image/gif' ||
    type === 'image/heic' ||
    type === 'image/heif'
  ) {
    return type
  }

  const extension = file.name.split('.').pop()?.toLowerCase()

  if (extension === 'jpg' || extension === 'jpeg') {
    return 'image/jpeg'
  }

  if (extension === 'png') {
    return 'image/png'
  }

  if (extension === 'webp') {
    return 'image/webp'
  }

  if (extension === 'gif') {
    return 'image/gif'
  }

  if (extension === 'heic') {
    return 'image/heic'
  }

  if (extension === 'heif') {
    return 'image/heif'
  }

  return null
}

async function optimizeImageFile(file: File, maxBytes: number): Promise<File> {
  const image = await loadImage(file)
  const baseScale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.width, image.height))
  const scaleSteps = [baseScale, baseScale * 0.86, baseScale * 0.72, baseScale * 0.58]
  const qualitySteps = [0.86, 0.78, 0.68, 0.58]
  let bestBlob: Blob | null = null

  for (const scale of scaleSteps) {
    for (const quality of qualitySteps) {
      const blob = await drawImageToBlob(image, scale, quality)
      bestBlob = blob

      if (blob.size <= maxBytes) {
        return blobToFile(blob, file.name)
      }
    }
  }

  if (!bestBlob) {
    throw new Error('Image optimization failed')
  }

  return blobToFile(bestBlob, file.name)
}

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)

  try {
    const image = new Image()
    image.decoding = 'async'
    image.src = url
    await image.decode()

    return image
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function drawImageToBlob(
  image: HTMLImageElement,
  scale: number,
  quality: number,
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.width * scale))
  canvas.height = Math.max(1, Math.round(image.height * scale))
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Canvas is unavailable')
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Image optimization failed'))
          return
        }

        resolve(blob)
      },
      COMPRESSED_IMAGE_TYPE,
      quality,
    )
  })
}

function blobToFile(blob: Blob, originalName: string): File {
  return new File([blob], `${stripImageExtension(originalName)}.jpg`, {
    type: COMPRESSED_IMAGE_TYPE,
  })
}

function stripImageExtension(fileName: string): string {
  const withoutExtension = fileName.replace(/\.[^.]+$/, '')

  return withoutExtension.length > 0 ? withoutExtension : 'imagem'
}

function replaceInputFiles(input: HTMLInputElement, files: File[]): void {
  const transfer = new DataTransfer()
  files.forEach((file) => {
    transfer.items.add(file)
  })
  input.files = transfer.files
}

function formatMegabytes(bytes: number): string {
  const megabytes = bytes / 1024 / 1024

  return Number.isInteger(megabytes) ? `${megabytes}MB` : `${megabytes.toFixed(1)}MB`
}
