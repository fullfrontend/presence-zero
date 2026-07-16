export interface RdapCacheStore {
  get(domain: string): Promise<{ available: boolean; checkedAt: Date } | null>
  set(domain: string, available: boolean, checkedAt: Date): Promise<void>
}

export interface RdapDeps {
  cache: RdapCacheStore
  fetchFn?: typeof fetch
  now?: () => Date
  sleep?: (ms: number) => Promise<void>
}

export const AVAILABLE_TTL_MS = 24 * 60 * 60 * 1000
export const TAKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000
const MIN_GAP_MS = 1000

export function createRdapChecker(deps: RdapDeps): (domain: string) => Promise<boolean | null> {
  const { cache, fetchFn = fetch, now = () => new Date() } = deps
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>(r => setTimeout(r, ms)))
  let lastCall = 0

  return async function checkDomain(domain: string): Promise<boolean | null> {
    const cached = await cache.get(domain)
    if (cached) {
      const age = now().getTime() - cached.checkedAt.getTime()
      if (age < (cached.available ? AVAILABLE_TTL_MS : TAKEN_TTL_MS)) return cached.available
    }
    for (let attempt = 0; attempt < 3; attempt++) {
      const gap = now().getTime() - lastCall
      if (gap < MIN_GAP_MS) await sleep(MIN_GAP_MS - gap)
      lastCall = now().getTime()
      let res: Response
      try {
        res = await fetchFn(`https://rdap.org/domain/${domain}`, { redirect: 'follow' })
      } catch {
        return null
      }
      if (res.status === 404) { await cache.set(domain, true, now()); return true }
      if (res.status === 429) { await sleep(1000 * 2 ** attempt); continue }
      if (res.ok) { await cache.set(domain, false, now()); return false }
      return null
    }
    return null
  }
}
