import { randomUUID } from 'node:crypto'
import { and, eq, lte } from 'drizzle-orm'
import type { Db } from '@/db/client'
import { searchThrottle } from '@/db/schema'
import type { WebsiteSearchInput, WebsiteSearchResult } from './website-search'

type Search = (input: WebsiteSearchInput) => Promise<WebsiteSearchResult>

/** Database lease shares pacing/cooldowns across scans, workers and restarts. */
export function createSearchThrottle(db: Db, key: string, options: {
  intervalMs: number
  cooldownMs: number
  maxRetries?: number
  now?: () => number
  sleep?: (ms: number) => Promise<void>
}) {
  const now = options.now ?? Date.now
  const sleep = options.sleep ?? (ms => new Promise(resolve => setTimeout(resolve, ms)))
  // SearXNG requests time out at 12s. A lease expires if a worker dies.
  const leaseMs = 30000
  return (search: Search): Search => async input => {
    if (!input.address) return search(input)
    await db.insert(searchThrottle).values({ key }).onConflictDoNothing()
    for (let attempt = 0; ; attempt++) {
      const owner = randomUUID()
      for (;;) {
        const time = now()
        const acquired = await db.update(searchThrottle).set({
          owner, leaseUntil: time + leaseMs, nextAllowedAt: time + options.intervalMs,
        }).where(and(eq(searchThrottle.key, key), lte(searchThrottle.leaseUntil, time),
          lte(searchThrottle.nextAllowedAt, time), lte(searchThrottle.blockedUntil, time)))
          .returning({ key: searchThrottle.key })
        if (acquired.length) break
        const state = (await db.select().from(searchThrottle).where(eq(searchThrottle.key, key)))[0]
        const wait = Math.max(state.nextAllowedAt, state.blockedUntil) - now()
        // Poll active leases briefly; sleep cooldowns in bounded chunks.
        await sleep(Math.min(30000, Math.max(100, wait > 0 ? wait : 1000)))
      }
      let result: WebsiteSearchResult
      try {
        result = await search(input)
        if (result.retryAfterMs && result.retryAfterMs > 0) {
          const cooldown = Math.max(options.cooldownMs, result.retryAfterMs)
          await db.update(searchThrottle).set({ blockedUntil: now() + cooldown })
            .where(and(eq(searchThrottle.key, key), eq(searchThrottle.owner, owner)))
          result = { ...result, retryAfterMs: cooldown }
        }
      } finally {
        await db.update(searchThrottle).set({ leaseUntil: 0, owner: null })
          .where(and(eq(searchThrottle.key, key), eq(searchThrottle.owner, owner)))
      }
      if (!result.retryAfterMs || result.website || attempt >= (options.maxRetries ?? 1)) return result
      // Re-enter the shared gate: wait for cooldown before retrying this same business.
    }
  }
}
