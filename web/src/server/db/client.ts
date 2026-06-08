import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'

import { readServerEnv } from '../env'
import * as schema from './schema'

let database: ReturnType<typeof drizzle<typeof schema>> | null = null

export function getDatabase(): ReturnType<typeof drizzle<typeof schema>> {
  if (!database) {
    const client = postgres(readServerEnv().DATABASE_URL)
    database = drizzle(client, { schema })
  }

  return database
}
