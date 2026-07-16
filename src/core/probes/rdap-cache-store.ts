import { eq } from 'drizzle-orm'
import type { Db } from '@/db/client'
import { rdapCache } from '@/db/schema'
import type { RdapCacheStore } from './rdap'

export function createDrizzleRdapCache(db: Db): RdapCacheStore {
  return {
    async get(domain) {
      const rows = await db.select().from(rdapCache).where(eq(rdapCache.domain, domain))
      return rows[0] ? { available: rows[0].available, checkedAt: rows[0].checkedAt } : null
    },
    async set(domain, available, checkedAt) {
      await db.insert(rdapCache).values({ domain, available, checkedAt })
        .onConflictDoUpdate({ target: rdapCache.domain, set: { available, checkedAt } })
    },
  }
}
