import {
  EquipmentPhotoUploadResponseSchema,
  OkResponseSchema,
} from '@forja/domain'

import { createDefaultMobileAuthService } from '@/server/auth/defaultService'
import { getDatabase } from '@/server/db/client'
import {
  errorResponse,
  jsonWithRequestId,
  requestId,
} from '@/server/http/responses'
import {
  deleteEquipmentPhoto,
  getUploadsDir,
  PhotoServiceError,
  uploadEquipmentPhoto,
} from '@/server/services/photos/equipmentPhotoService'

type PhotoRouteContext = {
  params: Promise<{
    exerciseId: string
  }>
}

export async function PUT(
  request: Request,
  context: PhotoRouteContext,
): Promise<Response> {
  const id = requestId(request.headers)

  try {
    const user = await createDefaultMobileAuthService().getCurrentMobileUser({
      authorization: request.headers.get('authorization'),
    })
    const { exerciseId } = await context.params
    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof Blob)) {
      return errorResponse('invalid_request', 'Missing file', 400, id)
    }

    if (file.type !== 'image/jpeg') {
      return errorResponse(
        'unsupported_media_type',
        'Only JPEG uploads are supported',
        415,
        id,
      )
    }

    const response = await uploadEquipmentPhoto(getDatabase(), {
      uploadsDir: getUploadsDir(),
      userId: user.id,
      exerciseId,
      contentType: file.type,
      bytes: new Uint8Array(await file.arrayBuffer()),
      now: new Date(),
    })
    const validated = EquipmentPhotoUploadResponseSchema.parse(response)

    return jsonWithRequestId(validated, 200, id)
  } catch (error) {
    if (error instanceof PhotoServiceError) {
      return photoErrorResponse(error, id)
    }

    return errorResponse('unauthenticated', 'Unauthenticated', 401, id)
  }
}

export async function DELETE(
  request: Request,
  context: PhotoRouteContext,
): Promise<Response> {
  const id = requestId(request.headers)

  try {
    const user = await createDefaultMobileAuthService().getCurrentMobileUser({
      authorization: request.headers.get('authorization'),
    })
    const { exerciseId } = await context.params
    const response = await deleteEquipmentPhoto(getDatabase(), {
      uploadsDir: getUploadsDir(),
      userId: user.id,
      exerciseId,
      now: new Date(),
    })
    const validated = OkResponseSchema.parse(response)

    return jsonWithRequestId(validated, 200, id)
  } catch {
    return errorResponse('unauthenticated', 'Unauthenticated', 401, id)
  }
}

function photoErrorResponse(error: PhotoServiceError, requestIdValue: string): Response {
  if (error.code === 'upload_too_large') {
    return errorResponse(error.code, error.message, 413, requestIdValue)
  }

  if (error.code === 'unsupported_media_type') {
    return errorResponse(error.code, error.message, 415, requestIdValue)
  }

  return errorResponse(error.code, error.message, 404, requestIdValue)
}
