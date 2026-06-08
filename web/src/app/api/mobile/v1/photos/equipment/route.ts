import { EquipmentPhotoListResponseSchema } from '@forja/domain'

import { createDefaultMobileAuthService } from '@/server/auth/defaultService'
import { getDatabase } from '@/server/db/client'
import {
  errorResponse,
  jsonWithRequestId,
  requestId,
} from '@/server/http/responses'
import { listEquipmentPhotos } from '@/server/services/photos/equipmentPhotoService'

export async function GET(request: Request): Promise<Response> {
  const id = requestId(request.headers)

  try {
    const user = await createDefaultMobileAuthService().getCurrentMobileUser({
      authorization: request.headers.get('authorization'),
    })
    const response = await listEquipmentPhotos(getDatabase(), { userId: user.id })
    const validated = EquipmentPhotoListResponseSchema.parse(response)

    return jsonWithRequestId(validated, 200, id)
  } catch {
    return errorResponse('unauthenticated', 'Unauthenticated', 401, id)
  }
}
