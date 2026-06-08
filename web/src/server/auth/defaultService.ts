import { getDatabase } from '../db/client'
import { readServerEnv } from '../env'
import { createGoogleOAuthClient } from './google'
import { createMobileAuthService } from './mobileAuth'

export function createDefaultMobileAuthService(): ReturnType<
  typeof createMobileAuthService
> {
  const env = readServerEnv()

  return createMobileAuthService({
    db: getDatabase(),
    env,
    googleClient: createGoogleOAuthClient(env),
  })
}
