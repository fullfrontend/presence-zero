export const PARKED_PATTERNS: RegExp[] = [
  /domain (is )?for sale/i, /buy this domain/i, /parked free/i, /this domain has expired/i,
  /sedoparking/i, /godaddy\.com\/domainsearch/i, /hugedomains\.com/i, /afternic\.com/i, /dan\.com\/buy-domain/i,
]

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

export function createWebsiteProbe(fetchFn: typeof fetch = fetch, timeoutMs = 8000) {
  return async function probe(url: string): Promise<'alive' | 'dead' | 'parked'> {
    const target = /^https?:\/\//i.test(url) ? url : `https://${url}`
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      const res = await fetchFn(target, {
        signal: ctrl.signal,
        redirect: 'follow',
        headers: { 'User-Agent': 'PresenceZero/0.1 (open-source lead finder)' },
      })
      if (res.status >= 500) return 'dead'
      const html = await readBounded(res, 100_000)
      return PARKED_PATTERNS.some(p => p.test(html)) ? 'parked' : 'alive'
    } catch {
      return 'dead'
    } finally {
      clearTimeout(timer)
    }
  }
}
