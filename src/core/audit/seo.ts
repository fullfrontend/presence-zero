import { load } from 'cheerio'
import type { PageEvidence } from './types'
import type { SeoCheck, SeoPage, SeoReport } from './technical-types'

/** HTML-only checks: missing markup is unknown if the fetched document was truncated. */
export function inspectSeo(html: string, url: string, truncated: boolean, headers: Headers, responseMs: number): SeoPage {
  const $ = load(html)
  const clean = (text: string) => text.replace(/\s+/g, ' ').trim().slice(0, 500)
  const title = clean($('title').text())
  const description = clean($('meta[name="description" i]').attr('content') ?? '')
  const checks: SeoCheck[] = []
  function presence(id: string, label: string, present: boolean, detail: string) {
    checks.push({ id, label, status: present ? 'pass' : truncated ? 'unknown' : 'warning', detail: !present && truncated ? 'Incomplete HTML; absence cannot be established.' : detail })
  }
  presence('title', 'Page title', !!title, title ? `HTML title: ${title}` : 'No HTML title found in the complete retrieved document.')
  presence('description', 'Meta description', !!description, description ? `Meta description: ${description}` : 'No meta description found; search engines may generate a snippet from page content.')
  const robots = [$('meta[name="robots" i]').attr('content'), $('meta[name="googlebot" i]').attr('content'), headers.get('x-robots-tag')].filter(Boolean).join(', ').toLowerCase()
  const noindex = /\b(noindex|none)\b/.test(robots)
  checks.push({ id: 'indexing', label: 'Indexing directives', status: noindex ? 'warning' : truncated ? 'unknown' : 'pass', detail: noindex ? 'A noindex directive was observed. Verify whether excluding this page is intentional.' : 'No noindex directive observed. This does not prove indexing or search visibility.' })
  const headings = $('h1').length
  presence('heading', 'Main heading', headings > 0, headings ? `${headings} H1 heading(s) observed. Multiple headings alone are not an SEO penalty.` : 'No H1 in retrieved HTML; review whether the main topic is clearly communicated.')
  presence('language', 'Document language', !!$('html').attr('lang')?.trim(), $('html').attr('lang') ? `Declared language: ${clean($('html').attr('lang')!)}` : 'No document language declared; assistive technologies may mispronounce content.')
  presence('viewport', 'Mobile viewport', !!$('meta[name="viewport" i]').attr('content'), $('meta[name="viewport" i]').length ? 'Viewport declared; mobile rendering has not been verified by this HTML check.' : 'No viewport declaration; mobile rendering should be tested.')
  const canonical = $('link[rel~="canonical" i]').attr('href')
  let canonicalDetail = 'No canonical declared. This is not automatically a defect; search engines can select a canonical.'
  let canonicalStatus: SeoCheck['status'] = 'unknown'
  if (canonical) {
    try {
      const parsed = new URL(canonical, url)
      if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error()
      canonicalStatus = parsed.origin === new URL(url).origin ? 'pass' : 'warning'
      canonicalDetail = `Declared canonical: ${parsed.href.slice(0, 500)}${canonicalStatus === 'warning' ? ' (different origin; verify intent)' : ''}`
    } catch { canonicalStatus = 'warning'; canonicalDetail = 'Malformed canonical URL observed.' }
  }
  checks.push({ id: 'canonical', label: 'Canonical URL', status: canonicalStatus, detail: canonicalDetail })
  const missingAlt = $('img:not([alt])').length
  checks.push({ id: 'image-alt', label: 'Image alternatives', status: missingAlt ? 'warning' : truncated ? 'unknown' : 'pass', detail: `${missingAlt} image(s) without an alt attribute in sampled HTML. Empty alt can be correct for decorative images; image meaning needs manual review.` })
  const scripts = $('script[type="application/ld+json" i]').toArray()
  let invalid = 0
  for (const script of scripts) { try { JSON.parse($(script).text()) } catch { invalid++ } }
  checks.push({ id: 'structured-data', label: 'Structured data', status: invalid ? truncated ? 'unknown' : 'warning' : scripts.length ? 'pass' : 'unknown', detail: `${scripts.length} JSON-LD block(s), ${invalid} invalid JSON block(s). Syntax only: schema validity and rich-result eligibility were not tested. No JSON-LD alone is not a ranking defect.` })
  return { title, description, checks, responseMs }
}

export function summarizeSeo(pages: PageEvidence[]): SeoReport {
  const checked = pages.filter(page => page.seo)
  const checks = checked.flatMap(page => page.seo!.checks.map(check => ({ ...check, evidenceId: page.id })))
  for (const field of ['title', 'description'] as const) {
    const groups = new Map<string, PageEvidence[]>()
    for (const page of checked) {
      const value = page.seo![field].toLowerCase()
      if (value) groups.set(value, [...(groups.get(value) ?? []), page])
    }
    for (const group of groups.values()) if (group.length > 1) checks.push({ id: `duplicate-${field}`, label: field === 'title' ? 'Repeated titles' : 'Repeated descriptions', status: 'warning', evidenceId: group[0].id, detail: `Identical ${field} on sampled pages: ${group.map(page => page.id).join(', ')}. Review page differentiation; this is not evidence of a search penalty.` })
  }
  return { pagesChecked: checked.length, pagesIncomplete: pages.filter(page => page.error || page.truncated).length, checks }
}
