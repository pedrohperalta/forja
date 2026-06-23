import { createDefaultMobileAuthService } from '@/server/auth/defaultService'
import { getDatabase } from '@/server/db/client'
import { errorResponse, requestId, toErrorResponse } from '@/server/http/responses'
import {
  downloadEquipmentPhoto,
  getUploadsDir,
} from '@/server/services/photos/equipmentPhotoService'

type DownloadRouteContext = {
  params: Promise<{
    exerciseId: string
  }>
}

export async function GET(request: Request, context: DownloadRouteContext): Promise<Response> {
  const id = requestId(request.headers)

  try {
    const user = await createDefaultMobileAuthService().getCurrentMobileUser({
      authorization: request.headers.get('authorization'),
    })
    const { exerciseId } = await context.params
    const photo = await downloadEquipmentPhoto(getDatabase(), {
      uploadsDir: getUploadsDir(),
      userId: user.id,
      exerciseId,
    })

    if (!photo) {
      return errorResponse('not_found', 'Photo not found', 404, id)
    }

    return new Response(toArrayBuffer(photo.bytes), {
      status: 200,
      headers: {
        'content-type': photo.contentType,
        'x-request-id': id,
      },
    })
  } catch (error) {
    return toErrorResponse(error, id)
  }
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}
