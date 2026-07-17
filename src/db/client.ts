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
      const url = process.env.DATABASE_URL ?? 'file:presencezero.db'
      const db = createDb(url, process.env.DATABASE_AUTH_TOKEN)
      try {
        await migrate(db, { migrationsFolder: 'drizzle' })
      } catch (err) {
        // Don't poison the singleton — let the next request retry (e.g. a cold-start race).
        _dbPromise = null
        const where = url.startsWith('file:') ? url : '[remote libSQL/Turso]'
        throw new Error(
          `PresenceZero: failed to run migrations from ./drizzle against ${where}. ` +
          'On Vercel this usually means the migrations folder was not bundled — keep ' +
          "`outputFileTracingIncludes: { '/**': ['./drizzle/**'] }` in next.config.ts. " +
          `Original error: ${err instanceof Error ? err.message : String(err)}`,
        )
      }
      return db
    })()
  }
  return _dbPromise
}
