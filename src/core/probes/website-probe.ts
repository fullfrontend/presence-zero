import { isFacebookUrl, FACEBOOK_DETAIL } from './facebook'
import { lookup as dnsLookup } from 'node:dns/promises'
import { isBlockedAddress } from './ip-guard'

export const PARKED_PATTERNS: RegExp[] = [
  /domain (is )?for sale/i, /buy this domain/i, /parked free/i, /this domain has expired/i,
  /sedoparking/i, /godaddy\.com\/domainsearch/i, /hugedomains\.com/i, /afternic\.com/i, /dan\.com\/buy-domain/i,
]

const MAX_REDIRECTS = 5

const CERTIFICATE_ERRORS = new Set([
  'DEPTH_ZERO_SELF_SIGNED_CERT', 'SELF_SIGNED_CERT_IN_CHAIN', 'CERT_HAS_EXPIRED',
  'CERT_NOT_YET_VALID', 'ERR_TLS_CERT_ALTNAME_INVALID', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY', 'UNABLE_TO_GET_ISSUER_CERT', 'CERT_UNTRUSTED',
])

/** Node fetch wraps TLS failures in cause; do not infer certificate problems from prose. */
function tlsDiagnostic(error: unknown): string | null {
  const seen = new Set<unknown>()
  for (let depth = 0; depth < 8 && error && typeof error === 'object' && !seen.has(error); depth++) {
    seen.add(error)
    const { code, cause } = error as { code?: unknown; cause?: unknown }
    if (typeof code === 'string') {
      if (CERTIFICATE_ERRORS.has(code)) return `HTTPS certificate validation failed (${code}). Website availability could not be verified.`
      if (/^(ERR_SSL_|ERR_TLS_)[A-Z0-9_]+$/.test(code)) return `HTTPS negotiation failed (${code}). Website availability could not be verified.`
    }
    error = cause
  }
  return null
}

/** A presence verdict plus the human reason behind it. */
export interface ProbeResult {
  status: 'alive' | 'dead' | 'parked' | 'facebook' | 'configuration_error' | 'probe_failed'
  detail: string
}

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
 * Probes a listed website and returns a `ProbeResult` carrying its `alive | dead | parked | facebook | configuration_error | probe_failed`
 * label plus the human-readable reason behind it.
 *
 * SSRF-hardened: only http(s) is fetched, redirects are followed manually, and
 * every hop's host is DNS-resolved and checked against private/loopback/link-local/
 * metadata ranges before any request. A blocked or malformed target is treated as
 * `dead` — the probe returns only a status and explanation. Facebook destinations are
 * classified without fetching the social page.
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

  return async function probe(url: string): Promise<ProbeResult> {
    const dead = (detail: string): ProbeResult => ({ status: 'dead', detail })
    const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(url)
    let target = hasScheme ? url : `https://${url}`
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      for (let hop = 0; hop < MAX_REDIRECTS; hop++) {
        let parsed: URL
        try { parsed = new URL(target) } catch { return dead('Not a valid web address.') }
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          return dead('Not an http or https address.')
        }

        if (isFacebookUrl(target)) return { status: 'facebook', detail: FACEBOOK_DETAIL }

        let addresses: string[]
        try { addresses = await lookup(parsed.hostname) } catch {
          return dead('DNS lookup failed — the domain no longer resolves.')
        }
        if (addresses.length === 0 || addresses.some(isBlockedAddress)) {
          return dead('Blocked — resolves to a private or internal address.')
        }

        const res = await fetchFn(target, {
          signal: ctrl.signal,
          redirect: 'manual',
          headers: { 'User-Agent': 'PresenceZero/0.1 (open-source lead finder)' },
        })

        if (res.status >= 300 && res.status < 400) {
          const location = res.headers.get('location')
          if (!location) return dead('Redirected with no destination.')
          try { target = new URL(location, target).toString() } catch {
            return dead('Redirected to an invalid address.')
          }
          continue
        }
        if (res.status >= 500 || res.status === 410) return dead(`Returned HTTP ${res.status}.`)
        if (res.status >= 400 && res.status !== 404) return { status: 'probe_failed', detail: `HTTP ${res.status} prevented website verification.` }


        const html = await readBounded(res, 100_000)
        if (/domain has been assigned/i.test(html) && /please go to the site settings and put the domain name in the domain tab/i.test(html) && /https:\/\/tilda\.(cc|ws)/i.test(html)) {
          return { status: 'configuration_error', detail: 'The hosting service reports that the domain is not configured for the website.' }
        }
        if (res.status === 404) return dead('Returned HTTP 404.')
        return PARKED_PATTERNS.some(p => p.test(html))
          ? { status: 'parked', detail: 'Matched a registrar for-sale page.' }
          : { status: 'alive', detail: 'Responded normally.' }
      }
      return { status: 'configuration_error', detail: `Redirect loop — more than ${MAX_REDIRECTS} hops.` }
    } catch (error) {
      const tlsDetail = tlsDiagnostic(error)
      if (!ctrl.signal.aborted && tlsDetail) return { status: 'configuration_error', detail: tlsDetail }
      // The abort signal is the source of truth for "timed out" — never sniff error text.
      return dead(ctrl.signal.aborted ? `Timed out after ${Math.round(timeoutMs / 1000)}s.` : 'The connection failed.')
    } finally {
      clearTimeout(timer)
    }
  }
}
