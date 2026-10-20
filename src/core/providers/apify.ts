import { coordinates } from '../coordinates'
import type { ProviderConfig, RawBusiness, ScanArea } from '../types'
import { Provider, ProviderError } from './provider'

const API_BASE = 'https://api.apify.com/v2'
const ACTOR_ID = 'compass~crawler-google-places'
const POLL_INTERVAL_MS = 2000

export const DEFAULT_MAX_PLACES = 50
export const MAX_PLACES_CEILING = 100
export const MAX_POLLS = 600

export interface ApifyDeps {
  fetchFn?: typeof fetch
  sleep?: (ms: number) => Promise<void>
  maxPlacesCeiling?: number
}

/**
 * Only these four keys may ever be sent. Every other actor field — filters,
 * place details, reviews, images, contacts, leads — is separately billed.
 * `maxCrawledPlacesPerSearch` must always be present: empty means "scrape all".
 */
export function buildApifyInput(area: ScanArea, maxPlaces: number): Record<string, unknown> {
  return {
    searchStringsArray: [area.category],
    locationQuery: area.location,
    maxCrawledPlacesPerSearch: maxPlaces,
    language: 'en',
  }
}

function clampPlaces(n: number | undefined, ceiling: number): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return Math.min(DEFAULT_MAX_PLACES, ceiling)
  return Math.min(Math.max(Math.trunc(n), 1), ceiling)
}

const str = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim().length > 0 ? v.trim() : undefined
const num = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined

/** Defensive: dataset items are untrusted third-party JSON. */
export function mapApifyPlace(raw: unknown): RawBusiness | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Record<string, unknown>
  const name = str(p.title)
  if (!name) return null
  const point = p.location && typeof p.location === 'object' ? p.location as Record<string, unknown> : {}
  const composed = [str(p.street), str(p.city)].filter(Boolean).join(', ')
  return {
    name,
    ...coordinates(point.lat, point.lng),
    address: str(p.address) ?? (composed || undefined),
    phone: str(p.phone) ?? str(p.phoneUnformatted),
    category: str(p.categoryName),
    rating: num(p.totalScore),
    reviewCount: num(p.reviewsCount),
    website: str(p.website),
    closed: p.permanentlyClosed === true || p.temporarilyClosed === true,
  }
}

function parseCursor(cursor: string): { runId: string; polls: number } | null {
  const m = /^apify:([^:]+):(\d+)$/.exec(cursor)
  return m ? { runId: m[1], polls: Number(m[2]) } : null
}

export function createApifyProvider(deps: ApifyDeps = {}): Provider {
  const fetchFn = deps.fetchFn ?? fetch
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>(r => setTimeout(r, ms)))
  const ceiling = deps.maxPlacesCeiling ?? MAX_PLACES_CEILING

  return {
    id: 'apify',
    async fetchPage(area: ScanArea, cursor: string | null, config: ProviderConfig) {
      const token = config.apifyToken
      if (!token) {
        throw new ProviderError('Apify requires an API token — add one in Settings or set APIFY_TOKEN.')
      }
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

      if (!cursor) {
        const input = buildApifyInput(area, clampPlaces(config.maxPlaces, ceiling))
        const res = await fetchFn(`${API_BASE}/acts/${ACTOR_ID}/runs`, {
          method: 'POST', headers, body: JSON.stringify(input),
        })
        // costlyRetry: this POST may already have spent money if res.ok — an unparseable
        // body must not be recoverable, or Resume (cursor === null) re-POSTs and double-bills.
        const body = await readJson(res, token, { costlyRetry: true })
        const runId = (body as { data?: { id?: string } }).data?.id
        // The run-start POST may already have spent money even though we can't read
        // the run id back — recoverable here would let Resume start a second run and
        // double-bill. Non-recoverable forces the user to check the Apify console.
        if (!runId) {
          throw new ProviderError(
            'Apify started the run but did not return a run id — check your Apify console for a possibly-started run before retrying.',
          )
        }
        return { businesses: [], nextCursor: `apify:${runId}:1` }
      }

      const parsed = parseCursor(cursor)
      if (!parsed) throw new ProviderError('Invalid Apify scan cursor — start a new scan.')
      const { runId, polls } = parsed
      if (polls > MAX_POLLS) {
        // Resume is fresh user intent to keep waiting — reset the poll count against
        // the SAME run (never re-POST a new run) so Resume can actually make progress
        // instead of re-throwing this same error forever at polls=601.
        throw new ProviderError(
          'Run still in progress — resume the scan to keep waiting.',
          true,
          `apify:${runId}:1`,
        )
      }

      await sleep(POLL_INTERVAL_MS)
      const runRes = await fetchFn(`${API_BASE}/actor-runs/${runId}`, { headers })
      const runBody = await readJson(runRes, token)
      const run = (runBody as { data?: { status?: string; defaultDatasetId?: string } }).data
      const status = run?.status

      // ABORTING/TIMING-OUT are transitional — they will settle into ABORTED/TIMED-OUT
      // (or SUCCEEDED) on their own, so keep polling exactly like READY/RUNNING.
      if (status === 'READY' || status === 'RUNNING' || status === 'ABORTING' || status === 'TIMING-OUT') {
        return { businesses: [], nextCursor: `apify:${runId}:${polls + 1}` }
      }
      if (status === 'SUCCEEDED') {
        const datasetId = run?.defaultDatasetId
        if (!datasetId) throw new ProviderError('Apify run finished without a dataset.', true)
        const itemsRes = await fetchFn(`${API_BASE}/datasets/${datasetId}/items?clean=true&format=json`, { headers })
        const items = await readJson(itemsRes, token)
        const list = Array.isArray(items) ? items : []
        const businesses = list
          .map(mapApifyPlace)
          .filter((b): b is RawBusiness => b !== null)
        return { businesses, nextCursor: null }
      }
      // ABORTED/TIMED-OUT are terminal — the run is dead and Resume can only re-poll
      // the same dead run and land right back here. Non-recoverable forces a fresh scan
      // instead of an infinite pause loop.
      if (status === 'ABORTED' || status === 'TIMED-OUT') {
        const verb = status === 'ABORTED' ? 'aborted' : 'timed out'
        throw new ProviderError(
          `The Apify run was ${verb} and cannot be resumed — start a new scan. The run is still visible in your Apify console.`,
        )
      }
      throw new ProviderError('The Apify run failed — check the run in your Apify console.')
    },
  }
}

function redact(text: string, token: string): string {
  return token.length > 0 ? text.split(token).join('***') : text
}

const CREDIT_ERROR_TYPES = new Set(['limit-reached', 'monthly-usage-limit-exceeded', 'account-usage-limit-exceeded'])
const AUTH_ERROR_TYPES = new Set(['token-not-found', 'missing-api-token', 'missing-actor-rights', 'insufficient-permissions'])

async function readJson(res: Response, token: string, opts: { costlyRetry?: boolean } = {}): Promise<unknown> {
  if (res.ok) {
    try { return await res.json() } catch {
      // costlyRetry: res.ok means this request (the run-start POST) may already have
      // spent money, so an unparseable body must be non-recoverable — Resume must not
      // re-POST and double-bill. Poll/dataset calls are free, so they stay recoverable.
      throw opts.costlyRetry
        ? new ProviderError(
            'Apify returned an unreadable response after starting the run — check your Apify console for a possibly-started run before retrying.',
          )
        : new ProviderError('Apify returned an unreadable response.', true)
    }
  }
  let type = ''
  let message = ''
  try {
    const body = (await res.json()) as { error?: { type?: string; message?: string } }
    type = body.error?.type ?? ''
    message = body.error?.message ?? ''
  } catch { /* non-JSON error body — fall through to status-based mapping */ }

  if (CREDIT_ERROR_TYPES.has(type) || type.includes('usage-limit')) {
    throw new ProviderError('Apify credit exhausted — the free $5 resets next billing cycle, or switch provider.', true)
  }
  if (res.status === 401 || res.status === 403 || AUTH_ERROR_TYPES.has(type)) {
    throw new ProviderError('Apify rejected the API token — check it is valid.')
  }
  if (res.status === 429) throw new ProviderError('Apify is rate-limiting — the scan will resume.', true)
  if (res.status >= 500) throw new ProviderError(`Apify error (HTTP ${res.status}) — retry shortly.`, true)
  throw new ProviderError(redact(message || `Apify request failed (HTTP ${res.status}).`, token))
}
