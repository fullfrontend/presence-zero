import { createHash } from 'node:crypto'
import { load } from 'cheerio'
import robotsParser from 'robots-parser'
import { createPublicFetch, readLimited, type PublicFetchOptions } from './public-fetch'
import type { PageEvidence } from './types'

export interface CrawlOptions extends PublicFetchOptions {
  maxPages: number
  timeoutMs: number
  maxBytes: number
  maxChars: number
  delayMs: number
  now?: () => number
  sleep?: (ms: number) => Promise<void>
}
export const cleanText = (value: string) => value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, '').replace(/\s+/g, ' ').trim()

export function createEvidenceCrawler(options: CrawlOptions) {
  const get = createPublicFetch(options)
  const now = options.now ?? Date.now
  const sleep = options.sleep ?? (ms => new Promise(resolve => setTimeout(resolve, ms)))
  return async (website: string): Promise<PageEvidence[]> => {
    const evidence: PageEvidence[] = []
    const initial = new URL(website.includes('://') ? website : `https://${website}`)
    if (!['http:', 'https:'].includes(initial.protocol) || initial.username || initial.password) throw new Error('unsafe_url')
    let origin = initial.origin
    const robotUrl = new URL('/robots.txt', origin).href
    let robots: ReturnType<typeof robotsParser>
    try {
      const { response, url } = await get(robotUrl, AbortSignal.timeout(options.timeoutMs))
      if (!response.ok && response.status !== 404) { await response.body?.cancel(); throw new Error('robots_unavailable') }
      const body = await readLimited(response, 100000)
      if (body.truncated) throw new Error('robots_too_large')
      const canonical = new URL(url)
      if (canonical.hostname.replace(/^www\./, '') !== initial.hostname.replace(/^www\./, '') || canonical.pathname !== '/robots.txt') throw new Error('invalid_robots_redirect')
      origin = canonical.origin
      robots = robotsParser(new URL('/robots.txt', origin).href, response.status === 404 ? '' : body.text)
    } catch {
      return [{ id: 'page-1', requestedUrl: robotUrl, url: robotUrl, retrievedAt: new Date(now()).toISOString(),
        statusCode: null, contentType: '', sha256: null, text: '', facts: [], truncated: false, error: 'robots_unavailable_or_blocked' }]
    }
    const queue = [new URL(initial.pathname, origin).href]
    const visited = new Set<string>()
    while (queue.length && evidence.length < options.maxPages) {
      const target = queue.shift()!
      if (visited.has(target)) continue
      visited.add(target)
      const crawlDelay = (robots.getCrawlDelay('PresenceZero') ?? 0) * 1000
      if (evidence.length && Number.isFinite(crawlDelay) && crawlDelay <= 60000) await sleep(Math.max(options.delayMs, crawlDelay))
      const page: PageEvidence = { id: `page-${evidence.length + 1}`, requestedUrl: target, url: target,
        retrievedAt: new Date(now()).toISOString(), statusCode: null, contentType: '', sha256: null,
        text: '', facts: [], truncated: false, error: null }
      evidence.push(page)
      if (!Number.isFinite(crawlDelay) || crawlDelay > 60000) { page.error = 'crawl_delay_exceeds_budget'; break }
      if (robots.isAllowed(target, 'PresenceZero') === false) { page.error = 'robots_disallowed'; continue }
      try {
        const { response, url } = await get(target, AbortSignal.timeout(options.timeoutMs), origin, url => robots.isAllowed(url, 'PresenceZero') !== false)
        page.url = url
        page.statusCode = response.status
        page.contentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() ?? ''
        if (!response.ok || !['text/html', 'application/xhtml+xml'].includes(page.contentType)) {
          await response.body?.cancel()
          page.error = response.ok ? 'unsupported_content_type' : 'http_error'
          continue
        }
        if (robots.isAllowed(url, 'PresenceZero') === false) { await response.body?.cancel(); page.error = 'robots_disallowed'; continue }
        const body = await readLimited(response, options.maxBytes)
        const $ = load(body.text)
        const facts: string[] = [`HTTPS: ${url.startsWith('https:') ? 'yes' : 'no'}`]
        const title = cleanText($('title').text()).slice(0, 300)
        const description = cleanText($('meta[name="description"]').attr('content') ?? '').slice(0, 500)
        const generator = cleanText($('meta[name="generator"]').attr('content') ?? '').slice(0, 150)
        if (title) facts.push(`Title: ${title}`)
        else if (!body.truncated) facts.push('No HTML title found in retrieved document')
        if (description) facts.push(`Description: ${description}`)
        else if (!body.truncated) facts.push('No meta description found in retrieved document')
        if (generator) facts.push(`Declared generator: ${generator}`)
        if ($('meta[name="viewport"]').length) facts.push('Viewport meta present (not a mobile usability test)')
        else if (!body.truncated) facts.push('No viewport meta found in retrieved document')
        const shopLinks = $('a[href]').toArray().map(a => $(a).attr('href') ?? '')
        if (shopLinks.some(href => /\/(cart|panier)(?:[/?#]|$)/i.test(href)) && shopLinks.some(href => /\/(checkout|commande)(?:[/?#]|$)/i.test(href))) facts.push('Cart and checkout links observed')
        $('script, style, noscript, svg, template, [hidden], [aria-hidden="true"]').remove()
        $('br, p, div, li, h1, h2, h3, section').prepend(' ')
        const text = cleanText(page.contentType === 'text/plain' ? body.text : $('body').text())
        const founded = [...text.matchAll(/(?:depuis|fond[ée]e? en|established in|since|opgericht in|dal)\s+(19\d{2}|20\d{2})\b/gi)]
          .map(match => Number(match[1])).filter(year => year <= new Date(now()).getUTCFullYear())
        if (founded.length) facts.push(`Claimed establishment year: ${Math.max(...founded)} (website claim, not independently verified)`)
        if (/\b(franchise|franchis[ée]|franchising|national chain|cha[iî]ne nationale)\b/i.test(text)) facts.push('Franchise or national-chain wording observed (heuristic)')
        page.text = text.slice(0, options.maxChars)
        page.truncated = body.truncated || text.length > options.maxChars
        page.facts = facts
        page.sha256 = createHash('sha256').update(JSON.stringify({ text: page.text, facts })).digest('hex')
        if (page.text.length < 200) { page.error = 'insufficient_content'; continue }
        // Only selected same-origin informational pages; never search, cart or arbitrary query URLs.
        for (const anchor of $('a[href]').toArray()) {
          try {
            const href = new URL($(anchor).attr('href')!, url)
            if (href.origin !== origin || href.search || href.username || href.password) continue
            href.hash = ''
            if (/contact|about|a-propos|qui-sommes|services|prestations|menu|over-ons/i.test(href.pathname)
              && !/logout|delete|cart|checkout|\.(pdf|zip|jpg|png)$/i.test(href.pathname)
              && queue.length < options.maxPages * 2 && !visited.has(href.href)) queue.push(href.href)
          } catch { /* Invalid anchor; no request. */ }
        }
      } catch { page.error = 'fetch_failed_or_blocked' }
    }
    return evidence
  }
}
