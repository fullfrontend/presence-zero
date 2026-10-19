import { lookup as dnsLookup } from 'node:dns/promises'
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { Readable } from 'node:stream'
import { isIP } from 'node:net'
import { isBlockedAddress } from '../probes/ip-guard'
import { isFacebookUrl } from '../probes/facebook'
import type { HostLookup } from '../probes/website-probe'

export interface PublicFetchOptions { fetchFn?: typeof fetch; lookup?: HostLookup }

// Connect to the validated IP, retaining the original Host and TLS server name.
// This pins DNS for the actual connection, including on every redirect hop.
function pinnedGet(url: URL, address: string, signal: AbortSignal): Promise<Response> {
  return new Promise((resolve, reject) => {
    const request = url.protocol === 'https:' ? httpsRequest : httpRequest
    const req = request({
      hostname: address, family: isIP(address), port: url.port || undefined,
      servername: url.hostname, path: url.pathname + url.search, method: 'GET', signal,
      headers: { Host: url.host, 'User-Agent': 'PresenceZero/0.1', Accept: 'text/html,text/plain', 'Accept-Encoding': 'identity' },
    }, res => {
      const headers = new Headers()
      for (const [key, value] of Object.entries(res.headers)) {
        if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(', ') : value)
      }
      const status = res.statusCode ?? 502
      if ([204, 205, 304].includes(status)) {
        res.resume()
        resolve(new Response(null, { status, headers }))
      } else resolve(new Response(Readable.toWeb(res) as ReadableStream<Uint8Array>, { status, headers }))
    })
    req.on('error', reject)
    req.end()
  })
}

export function createPublicFetch(options: PublicFetchOptions = {}) {
  const lookup = options.lookup ?? (async host => (await dnsLookup(host, { all: true })).map(r => r.address))
  return async (raw: string, signal: AbortSignal, allowedOrigin?: string, allowUrl?: (url: string) => boolean) => {
    let url = new URL(raw)
    for (let hop = 0; hop < 5; hop++) {
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || isFacebookUrl(url.href)
        || (url.port && !['80', '443'].includes(url.port)) || (allowedOrigin && url.origin !== allowedOrigin)) throw new Error('unsafe_url')
      if (allowUrl && !allowUrl(url.href)) throw new Error('disallowed_url')
      const host = url.hostname.replace(/^\[|\]$/g, '')
      let abortLookup: (() => void) | undefined
      let addresses: string[]
      try {
        addresses = isIP(host) ? [host] : await Promise.race([
          lookup(host),
          new Promise<never>((_, reject) => {
            abortLookup = () => reject(new Error('timeout'))
            if (signal.aborted) abortLookup()
            else signal.addEventListener('abort', abortLookup, { once: true })
          }),
        ])
      } finally {
        if (abortLookup) signal.removeEventListener('abort', abortLookup)
      }
      signal.throwIfAborted()
      if (!addresses.length || addresses.some(address => isBlockedAddress(address) || (isIP(address) === 6 && (!/^[23][0-9a-f]{3}:/i.test(address) || /^2001:(?:db8|0|10|20):|^2002:/i.test(address))))) throw new Error('unsafe_address')
      const response = options.fetchFn
        ? await options.fetchFn(url, { signal, redirect: 'manual', headers: { 'User-Agent': 'PresenceZero/0.1' } })
        : await pinnedGet(url, addresses[0], signal)
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location')
        await response.body?.cancel()
        if (!location) throw new Error('invalid_redirect')
        url = new URL(location, url)
        continue
      }
      return { response, url: url.href }
    }
    throw new Error('redirect_limit')
  }
}

export async function readLimited(response: Response, maxBytes: number) {
  if (!response.body) return { text: '', truncated: false }
  const reader = response.body.getReader()
  const parts: Uint8Array[] = []
  let length = 0
  let truncated = false
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      const take = Math.min(value.length, maxBytes - length)
      parts.push(value.subarray(0, take))
      length += take
      if (length >= maxBytes) { truncated = true; break }
    }
  } finally { await reader.cancel().catch(() => {}) }
  return { text: Buffer.concat(parts).toString('utf8'), truncated }
}
