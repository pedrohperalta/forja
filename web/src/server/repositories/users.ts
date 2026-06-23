import { eq } from 'drizzle-orm'

import * as schema from '../db/schema'
import { required, type Database, type UserRow } from './types'

export type CreateUserInput = {
  id?: string
  email: string
  name?: string
  avatarUrl?: string
  now: Date
}

export async function createUser(db: Database, input: CreateUserInput): Promise<UserRow> {
  const [user] = await db
    .insert(schema.users)
    .values({
      id: input.id,
      email: input.email,
      name: input.name ?? null,
      avatarUrl: input.avatarUrl ?? null,
      createdAt: input.now,
      updatedAt: input.now,
    })
    .returning()

  return required(user)
}

export async function findUserByEmail(db: Database, email: string): Promise<UserRow | null> {
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1)

  return user ?? null
}

export async function findUserById(db: Database, id: string): Promise<UserRow | null> {
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1)

  return user ?? null
}
