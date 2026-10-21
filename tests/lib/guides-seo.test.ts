import { describe, expect, it } from 'vitest'
import { GUIDES, getGuide, guidePath } from '@/content/guides'
import sitemap from '@/app/sitemap'
import robots from '@/app/robots'
import { GET as llmsTxt } from '@/app/llms.txt/route'
import { GET as rss } from '@/app/(marketing)/guides/rss.xml/route'
import { SITE_URL } from '@/lib/site'

describe('guide content SEO invariants', () => {
  it('has unique slugs and unique titles/descriptions', () => {
    const uniq = (xs: string[]) => new Set(xs).size === xs.length
    expect(uniq(GUIDES.map(g => g.slug))).toBe(true)
    expect(uniq(GUIDES.map(g => g.seoTitle))).toBe(true)
    expect(uniq(GUIDES.map(g => g.description))).toBe(true)
  })

  it.each(GUIDES.map(g => [g.slug, g] as const))('%s: title 30–60 chars, description 120–160 chars', (_slug, g) => {
    expect(g.seoTitle.length).toBeGreaterThanOrEqual(30)
    expect(g.seoTitle.length).toBeLessThanOrEqual(60)
    expect(g.description.length).toBeGreaterThanOrEqual(120)
    expect(g.description.length).toBeLessThanOrEqual(160)
  })

  it.each(GUIDES.map(g => [g.slug, g] as const))('%s: well-formed slug, dates, sections and related links', (_slug, g) => {
    expect(g.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    expect(g.published <= g.updated).toBe(true)
    expect(new Set(g.sections.map(s => s.id)).size).toBe(g.sections.length)
    expect(g.sections.length).toBeGreaterThanOrEqual(5)
    expect(g.faqs.length).toBeGreaterThan(0)
    for (const r of g.related) {
      expect(r).not.toBe(g.slug)
      expect(getGuide(r), `related slug ${r}`).toBeDefined()
    }
  })
})

describe('crawl surfaces', () => {
  it('lists every guide in the sitemap with an absolute URL', () => {
    const urls = sitemap().map(e => e.url)
    for (const g of GUIDES) expect(urls).toContain(`${SITE_URL}${guidePath(g.slug)}`)
    expect(urls).toContain(`${SITE_URL}/guides`)
    expect(urls).toContain(`${SITE_URL}/alternatives`)
    expect(urls.every(u => u.startsWith(SITE_URL))).toBe(true)
  })

  it('keeps the private app and API out of the index', () => {
    const rules = [robots().rules].flat()
    for (const r of rules) expect(r.disallow).toEqual(expect.arrayContaining(['/app', '/api/']))
  })

  it('llms.txt and the RSS feed link every guide', async () => {
    const txt = await llmsTxt().text()
    const xml = await rss().text()
    for (const g of GUIDES) {
      expect(txt).toContain(guidePath(g.slug))
      expect(xml).toContain(guidePath(g.slug))
    }
  })
})
