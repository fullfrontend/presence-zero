import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { migrate } from 'drizzle-orm/libsql/migrator'
import * as schema from './schema'

export function createDb(url: string, authToken?: string) {
  return drizzle(createClient({ url, authToken }), { schema })
}

export type Db = ReturnType<typeof createDb>

let _dbPromise: Promise<Db> | null = null

export function getDb(): Promise<Db> {
  if (!_dbPromise) {
    _dbPromise = (async () => {
      const db = createDb(
        process.env.DATABASE_URL ?? 'file:presencezero.db',
        process.env.DATABASE_AUTH_TOKEN,
      )
      await migrate(db, { migrationsFolder: 'drizzle' })
      return db
    })()
  }
  return _dbPromise
}
