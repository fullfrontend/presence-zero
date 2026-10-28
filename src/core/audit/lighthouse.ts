import { lookup as dnsLookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { isBlockedAddress } from '../probes/ip-guard'
import { readLimited } from './public-fetch'
import type { HostLookup } from '../probes/website-probe'
import type { LighthouseRun } from './technical-types'

type Audit = { score?: number | null; numericValue?: number; title?: string; displayValue?: string }
interface LighthouseResponse {
  lighthouseResult?: { runtimeError?: unknown; lighthouseVersion?: string; requestedUrl?: string; finalUrl?: string;
    categories?: Record<string, { score?: number | null }>; audits?: Record<string, Audit> }
}
const score = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1 ? Math.round(value * 100) : null
const metric = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null

/** Google's hosted Lighthouse runner; no arbitrary browser runs on the app's network. */
export function createLighthouseRunner(options: { apiKey?: string; strategy: 'mobile' | 'desktop' | 'both'; timeoutMs: number; fetchFn?: typeof fetch; lookup?: HostLookup; now?: () => number }) {
  const fetchFn = options.fetchFn ?? fetch
  const lookup = options.lookup ?? (async host => (await dnsLookup(host, { all: true })).map(row => row.address))
  const now = options.now ?? Date.now
  return async (website: string): Promise<LighthouseRun[]> => {
    const strategies = options.strategy === 'both' ? ['mobile', 'desktop'] as const : [options.strategy]
    const runs: LighthouseRun[] = []
    for (const strategy of strategies) {
      const start = now()
      const base = { strategy, checkedAt: new Date(start).toISOString(), requestedUrl: website, durationMs: 0 }
      const signal = AbortSignal.timeout(options.timeoutMs)
      try {
        const target = new URL(website)
        if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password || target.search || (target.port && !['80', '443'].includes(target.port))) throw new Error('unsafe_target')
        const host = target.hostname.replace(/^\[|\]$/g, '')
        let onAbort: (() => void) | undefined
        let addresses: string[]
        try {
          addresses = isIP(host) ? [host] : await Promise.race([lookup(host), new Promise<never>((_, reject) => {
            onAbort = () => reject(new Error('timeout'))
            if (signal.aborted) onAbort()
            else signal.addEventListener('abort', onAbort, { once: true })
          })])
        } finally { if (onAbort) signal.removeEventListener('abort', onAbort) }
        signal.throwIfAborted()
        if (!addresses.length || addresses.some(address => isBlockedAddress(address))) throw new Error('unsafe_target')
        target.hash = ''
        const endpoint = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed')
        endpoint.searchParams.set('url', target.href)
        endpoint.searchParams.set('strategy', strategy)
        for (const category of ['performance', 'accessibility', 'best-practices', 'seo']) endpoint.searchParams.append('category', category)
        const response = await fetchFn(endpoint, { signal, redirect: 'error', headers: options.apiKey ? { 'X-Goog-Api-Key': options.apiKey } : {} })
        if (!response.ok) { await response.body?.cancel(); throw new Error(`pagespeed_http_${response.status}`) }
        const body = await readLimited(response, 10_000_000)
        if (body.truncated) throw new Error('pagespeed_response_too_large')
        const result = (JSON.parse(body.text) as LighthouseResponse).lighthouseResult
        runs.push(parseLighthouseReport(result, website, { ...base, durationMs: now() - start }))
      } catch (error) {
        const code = error instanceof Error && /^(pagespeed_http_\d{3}|unsafe_target|pagespeed_response_too_large|lighthouse_unavailable)$/.test(error.message) ? error.message : 'pagespeed_failed_or_timed_out'
        runs.push({ ...base, status: 'unavailable', durationMs: now() - start, reason: code })
        if (code === 'pagespeed_http_429') break // Do not multiply requests during quota exhaustion.
      }
    }
    return runs
  }
}

/** Normalize an existing LHR as measured evidence; never combine another site's report. */
export function parseLighthouseReport(result: LighthouseResponse['lighthouseResult'], website: string, base: Pick<LighthouseRun, 'strategy' | 'checkedAt' | 'durationMs' | 'requestedUrl'>): LighthouseRun {
  if (!result || result.runtimeError || !result.categories || !result.audits) throw new Error('lighthouse_unavailable')
  if (!result.finalUrl || new URL(result.finalUrl).hostname.replace(/^www\./, '') !== new URL(website).hostname.replace(/^www\./, '')) throw new Error('lighthouse_unavailable')
  const scores = { performance: score(result.categories.performance?.score), accessibility: score(result.categories.accessibility?.score), seo: score(result.categories.seo?.score), bestPractices: score(result.categories['best-practices']?.score) }
  if (Object.values(scores).every(value => value === null)) throw new Error('lighthouse_unavailable')
  const audits = result.audits
  return { ...base, status: 'complete', finalUrl: result.finalUrl?.slice(0, 2048), version: result.lighthouseVersion?.slice(0, 50), scores,
    metrics: { lcpMs: metric(audits['largest-contentful-paint']?.numericValue), cls: metric(audits['cumulative-layout-shift']?.numericValue), tbtMs: metric(audits['total-blocking-time']?.numericValue), fcpMs: metric(audits['first-contentful-paint']?.numericValue), speedIndexMs: metric(audits['speed-index']?.numericValue) },
    opportunities: Object.entries(audits).filter(([, audit]) => typeof audit.score === 'number' && audit.score >= 0 && audit.score < 0.9)
      .slice(0, 12).map(([id, audit]) => ({ id: id.slice(0, 100), title: String(audit.title ?? id).slice(0, 250), detail: String(audit.displayValue ?? '').slice(0, 500) })),
  }
}
