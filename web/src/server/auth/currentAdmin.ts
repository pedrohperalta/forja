import { cookies } from 'next/headers'

import { getDatabase } from '../db/client'
import { readServerEnv } from '../env'
import {
  ADMIN_SESSION_COOKIE,
  getAdminUserFromSessionToken,
  type AdminUser,
} from './adminAuth'

export async function getCurrentAdminUser(): Promise<AdminUser | null> {
  const cookieStore = await cookies()

  return getAdminUserFromSessionToken({
    db: getDatabase(),
    env: readServerEnv(),
    sessionToken: cookieStore.get(ADMIN_SESSION_COOKIE)?.value ?? null,
    now: new Date(),
  })
}
