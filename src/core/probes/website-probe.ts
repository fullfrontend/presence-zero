import { lookup as dnsLookup } from 'node:dns/promises'
import { isBlockedAddress } from './ip-guard'

export const PARKED_PATTERNS: RegExp[] = [
  /domain (is )?for sale/i, /buy this domain/i, /parked free/i, /this domain has expired/i,
  /sedoparking/i, /godaddy\.com\/domainsearch/i, /hugedomains\.com/i, /afternic\.com/i, /dan\.com\/buy-domain/i,
]

const MAX_REDIRECTS = 5

/** Resolves a hostname to its IP addresses. Injectable so tests never touch the network. */
export type HostLookup = (host: string) => Promise<string[]>

export interface WebsiteProbeOptions {
  fetchFn?: typeof fetch
  timeoutMs?: number
  lookup?: HostLookup
}

const defaultLookup: HostLookup = async host => {
  const records = await dnsLookup(host, { all: true })
  return records.map(r => r.address)
}

async function readBounded(res: Response, maxBytes: number): Promise<string> {
  if (!res.body) return (await res.text()).slice(0, maxBytes)
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (total < maxBytes) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      total += value.length
    }
  } finally {
    await reader.cancel().catch(() => {})
  }
  const out = new Uint8Array(Math.min(total, maxBytes))
  let offset = 0
  for (const c of chunks) {
    if (offset >= out.length) break
    const take = Math.min(c.length, out.length - offset)
    out.set(c.subarray(0, take), offset)
    offset += take
  }
  return new TextDecoder().decode(out)
}

/**
 * Probes a listed website and labels it `alive | dead | parked`.
 *
 * SSRF-hardened: only http(s) is fetched, redirects are followed manually, and
 * every hop's host is DNS-resolved and checked against private/loopback/link-local/
 * metadata ranges before any request. A blocked or malformed target is treated as
 * `dead` — the probe never widens its output surface beyond those three labels.
 *
 * Accepts either a positional `fetchFn` (with optional options) or an options object.
 */
export function createWebsiteProbe(
  fetchOrOptions: typeof fetch | WebsiteProbeOptions = {},
  extra: WebsiteProbeOptions = {},
) {
  const options: WebsiteProbeOptions =
    typeof fetchOrOptions === 'function' ? { fetchFn: fetchOrOptions, ...extra } : fetchOrOptions
  const fetchFn = options.fetchFn ?? fetch
  const timeoutMs = options.timeoutMs ?? 8000
  const lookup = options.lookup ?? defaultLookup

  return async function probe(url: string): Promise<'alive' | 'dead' | 'parked'> {
    const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(url)
    let target = hasScheme ? url : `https://${url}`
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      for (let hop = 0; hop < MAX_REDIRECTS; hop++) {
        let parsed: URL
        try { parsed = new URL(target) } catch { return 'dead' }
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return 'dead'

        let addresses: string[]
        try { addresses = await lookup(parsed.hostname) } catch { return 'dead' }
        if (addresses.length === 0 || addresses.some(isBlockedAddress)) return 'dead'

        const res = await fetchFn(target, {
          signal: ctrl.signal,
          redirect: 'manual',
          headers: { 'User-Agent': 'PresenceZero/0.1 (open-source lead finder)' },
        })

        if (res.status >= 300 && res.status < 400) {
          const location = res.headers.get('location')
          if (!location) return 'dead'
          try { target = new URL(location, target).toString() } catch { return 'dead' }
          continue
        }
        if (res.status >= 500) return 'dead'

        const html = await readBounded(res, 100_000)
        return PARKED_PATTERNS.some(p => p.test(html)) ? 'parked' : 'alive'
      }
      return 'dead' // exceeded the redirect budget
    } catch {
      return 'dead'
    } finally {
      clearTimeout(timer)
    }
  }
}
