import { z } from 'zod'

const ServerEnvSchema = z.object({
  FORJA_PUBLIC_URL: z.string().url(),
  DATABASE_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  FORJA_ALLOWED_USER_EMAILS: z.string().min(1),
  FORJA_ADMIN_EMAILS: z.string().min(1),
  FORJA_ACCESS_TOKEN_SECRET: z.string().min(1),
  FORJA_REFRESH_TOKEN_SECRET: z.string().min(1),
  FORJA_ADMIN_SESSION_SECRET: z.string().min(1),
  FORJA_AUTH_CODE_SECRET: z.string().min(1),
  FORJA_OAUTH_STATE_SECRET: z.string().min(1),
  FORJA_SYNC_CURSOR_SECRET: z.string().min(1),
})

export type ServerEnv = z.infer<typeof ServerEnvSchema>

export function readServerEnv(env: NodeJS.ProcessEnv = process.env): ServerEnv {
  const result = ServerEnvSchema.safeParse(env)

  if (!result.success) {
    throw new Error('Invalid server environment')
  }

  return result.data
}
