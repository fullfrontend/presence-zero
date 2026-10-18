export interface WebsiteSearchInput {
  name: string
  address: string | null
}

export interface WebsiteSearchResult {
  website: string | null
  detail: string
}

interface SearchHit {
  url: string
  title: string
  description?: string
  extra_snippets?: string[]
}

function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim()
}

// Be deliberately conservative: a directory or a namesake must not hide a lead.
const GENERIC = new Set(['chez', 'restaurant', 'hotel', 'cafe', 'the', 'le', 'la', 'les', 'de', 'du', 'des'])
const EXCLUDED = /(^|\.)(facebook|instagram|tripadvisor|yelp|pagesdor|google|booking|thefork|restaurantguru|linkedin|wikipedia|petitfute)\./

function candidate(hit: SearchHit, input: WebsiteSearchInput): URL | null {
  const url = new URL(hit.url)
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || EXCLUDED.test(url.hostname)) return null
  const brand = normalize(input.name).split(' ').filter(t => t.length >= 3 && !GENERIC.has(t))
  const host = normalize(url.hostname.replace(/^www\./, '').split('.')[0]).replace(/ /g, '')
  if (!brand.length || !brand.every(t => host.includes(t))) return null
  const title = ` ${normalize(hit.title)} `
  if (!normalize(input.name).split(' ').every(t => title.includes(` ${t} `))) return null
  // Require street, building number and locality evidence, not just the town.
  const parts = input.address?.split(',').map(p => p.trim()).filter(Boolean) ?? []
  if (parts.length < 2 || !/\d/.test(parts[0])) return null
  const addressTokens = normalize(`${parts[0]} ${parts[1]}`).split(' ')
    .filter(t => t.length >= 3 || /^\d+$/.test(t))
  const evidence = ` ${normalize([hit.description, ...(hit.extra_snippets ?? [])].join(' '))} `
  if (!addressTokens.length || !addressTokens.every(t => evidence.includes(` ${t} `))) return null
  url.hash = ''
  return url
}

/** One bounded request per lookup. Failure or ambiguity never proves absence. */
export function createWebsiteSearch(apiKey: string, fetchFn: typeof fetch = fetch) {
  return async (input: WebsiteSearchInput): Promise<WebsiteSearchResult> => {
    if (!input.address) return { website: null, detail: 'Web search skipped: no address to verify the business identity.' }
    try {
      const endpoint = new URL('https://api.search.brave.com/res/v1/web/search')
      endpoint.search = new URLSearchParams({
        q: `${input.name} ${input.address} official website`.slice(0, 400),
        count: '5', extra_snippets: 'true', text_decorations: 'false', result_filter: 'web',
      }).toString()
      const res = await fetchFn(endpoint, {
        headers: { Accept: 'application/json', 'X-Subscription-Token': apiKey },
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) return { website: null, detail: `Web search unavailable (HTTP ${res.status}); website presence remains unverified.` }
      const data = await res.json() as { web?: { results?: SearchHit[] } }
      return matchResults(data.web?.results ?? [], input, 'Brave Search')
    } catch {
      return { website: null, detail: 'Web search failed; website presence remains unverified.' }
    }
  }
}

function matchResults(hits: SearchHit[], input: WebsiteSearchInput, source: string): WebsiteSearchResult {
  const matches = new Map<string, string>()
  for (const hit of hits) {
    try {
      const url = candidate(hit, input)
      if (url) matches.set(url.hostname.replace(/^www\./, ''), url.href)
    } catch { /* Ignore malformed individual results. */ }
  }
  if (matches.size !== 1) return {
    website: null,
    detail: 'Web search found no unambiguous website matching the name and address. This does not confirm absence of a website.',
  }
  return { website: [...matches.values()][0], detail: `Website discovered via ${source}; name, branded domain and address matched the search result.` }
}

/** The trusted operator configures this service URL; it is never taken from a lead. */
export function createSearxngWebsiteSearch(baseUrl: string, fetchFn: typeof fetch = fetch) {
  const endpoint = new URL(`${baseUrl.replace(/\/+$/, '')}/search`)
  if (!['http:', 'https:'].includes(endpoint.protocol) || endpoint.username || endpoint.password) {
    throw new Error('SEARXNG_URL must be an HTTP(S) URL without credentials.')
  }
  return async (input: WebsiteSearchInput): Promise<WebsiteSearchResult> => {
    if (!input.address) return { website: null, detail: 'Web search skipped: no address to verify the business identity.' }
    try {
      const url = new URL(endpoint)
      url.search = new URLSearchParams({
        q: `${input.name} ${input.address} official website`.slice(0, 400),
        format: 'json', categories: 'general',
      }).toString()
      const res = await fetchFn(url, {
        headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(12000),
        redirect: 'error',
      })
      if (!res.ok) return { website: null, detail: `SearXNG unavailable (HTTP ${res.status}); website presence remains unverified.` }
      const data = await res.json() as {
        results?: Array<{ url: string; title: string; content?: string }>
        unresponsive_engines?: unknown[]
      }
      const result = matchResults((data.results ?? []).slice(0, 10).map(hit => ({
        url: hit.url, title: hit.title, description: hit.content,
      })), input, 'SearXNG')
      if (!result.website && data.unresponsive_engines?.length) {
        result.detail = 'Some SearXNG engines were unavailable. ' + result.detail
      }
      return result
    } catch {
      return { website: null, detail: 'SearXNG search failed; website presence remains unverified.' }
    }
  }
}
