import { expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createEvidenceCrawler } from '@/core/audit/crawl'
import { createLeadAuditor, verifyIdentity } from '@/core/audit/audit-lead'
import { createOllamaAudit } from '@/core/audit/ollama'
import type { AuditInput } from '@/core/audit/types'
import fixture from '../../../fixtures/ollama-audit.json'

const input: AuditInput = { name: 'Chez Léon', address: 'Route de Philippeville 102, 6280 Gerpinnes', phone: '+32 71 12 34 56',
  category: 'restaurant', rating: 4.5, reviewCount: 50, website: 'https://restaurant.example', presence: 'alive' }
const html = readFileSync('fixtures/audit-home.html', 'utf8')
const crawl = createEvidenceCrawler({ maxPages: 1, timeoutMs: 1000, maxBytes: 200000, maxChars: 6000, delayMs: 0, now: () => 0,
  lookup: async () => ['93.184.216.34'], fetchFn: async url => String(url).endsWith('robots.txt') ? new Response('') : new Response(html, { headers: { 'Content-Type': 'text/html' } }) })
const infer = createOllamaAudit({ baseUrl: 'http://localhost:11434', model: 'fixture', timeoutMs: 1000, numCtx: 16384, numPredict: 2500, keepAlive: '0', language: 'fr', fetchFn: async () => Response.json(fixture) })
const options = { model: 'fixture', language: 'fr', opportunityThreshold: 60, minRating: 0, minReviews: 0, maxReviews: 1000000,
  excludeEcommerce: false, crawl, infer, now: () => 0 }

it('runs a grounded audit, verifies identity and separates quality from lead opportunity', async () => {
  const result = await createLeadAuditor(options)(input)
  expect(result.status).toBe('complete')
  expect(result.verification.status).toBe('matched')
  expect(result.websiteQuality).toBe(35)
  expect(result.opportunityScore).toBe(65)
  expect(result.qualified).toBe(true)
  expect(result.findings[0].evidenceId).toBe('page-1')
})

it('does not audit namesakes or accept name-only evidence', async () => {
  const mockInfer = vi.fn(infer)
  const result = await createLeadAuditor({ ...options, infer: mockInfer })({ ...input, address: '2 Other Avenue, 9999 Elsewhere', phone: null })
  expect(result.status).toBe('unverified')
  expect(result.websiteQuality).toBeNull()
  expect(mockInfer).not.toHaveBeenCalled()
  expect(verifyIdentity({ ...input, phone: null }, await crawl(input.website!)).status).toBe('matched')
})

it('rejects an invented evidence quote or unknown evidence reference', async () => {
  for (const override of [{ quote: 'Invented quote that is not in the page' }, { evidenceId: 'page-99' }]) {
    const result = await createLeadAuditor({ ...options, infer: async () => {
      const answer = await infer({})
      answer.findings[0] = { ...answer.findings[0], ...override }
      return answer
    } })(input)
    expect(result.status).toBe('failed')
    expect(result.qualified).toBe(false)
    expect(result.websiteQuality).toBeNull()
    expect(result.evidence).toHaveLength(1)
  }
})

it.each(['none', 'not_found', 'facebook', 'dead', 'parked'] as const)('summarizes %s without crawling or changing presence/score', async presence => {
  const mockCrawl = vi.fn(crawl)
  const result = await createLeadAuditor({ ...options, crawl: mockCrawl, infer: async () => ({ summary: 'Source listing context.', brief: 'Verify the existing presence first.', websiteQuality: null, findings: [] }) })({ ...input, presence })
  expect(result.status).toBe('complete')
  expect(result.mode).toBe('profile')
  expect(result.opportunityScore).toBeNull()
  expect(result.qualified).toBe(false)
  expect(mockCrawl).not.toHaveBeenCalled()
  expect(result.evidence[0].text).toContain(presence)
})

it('applies review/rating filters before crawling or inference', async () => {
  const mockCrawl = vi.fn(crawl)
  const result = await createLeadAuditor({ ...options, minReviews: 100, crawl: mockCrawl })(input)
  expect(result.status).toBe('skipped')
  expect(mockCrawl).not.toHaveBeenCalled()
})

it('excludes observed ecommerce only when explicitly configured', async () => {
  const mockInfer = vi.fn(infer)
  const pages = await crawl(input.website!)
  pages[0].facts.push('Cart and checkout links observed')
  expect((await createLeadAuditor({ ...options, excludeEcommerce: true, crawl: async () => pages, infer: mockInfer })(input)).status).toBe('skipped')
  expect(mockInfer).not.toHaveBeenCalled()
})

it('applies opt-in age and chain heuristics while preserving unknown age', async () => {
  const pages = await crawl(input.website!)
  const configured = { ...options, minBusinessAgeYears: 5, now: () => Date.UTC(2026, 9, 19), crawl: async () => pages }
  expect((await createLeadAuditor(configured)(input)).status).toBe('complete')
  pages[0].facts.push('Claimed establishment year: 2025 (website claim, not independently verified)')
  expect((await createLeadAuditor(configured)(input)).status).toBe('skipped')
  pages[0].facts.push('Franchise or national-chain wording observed (heuristic)')
  expect((await createLeadAuditor({ ...configured, excludeChains: true })(input)).reason).toContain('Franchise/chain')
})

it('uses light inference for profiles and heavy inference for website audits, with safe preparation fallback', async () => {
  const heavy = vi.fn(infer)
  const light = vi.fn(async () => ({ summary: 'Profile', brief: 'Verify first', websiteQuality: null, findings: [] }))
  const prepare = vi.fn(async () => { throw new Error('light model unavailable') })
  const audit = createLeadAuditor({ ...options, infer: heavy, profileInfer: light, lightModel: 'light-test', prepare,
    promptProfile: { id: 'private-profile', revision: 'hash' } })
  const profile = await audit({ ...input, presence: 'none' })
  expect(profile.model).toBe('light-test')
  expect(profile.promptProfile?.id).toBe('private-profile')
  expect(light).toHaveBeenCalledTimes(1)
  expect(heavy).not.toHaveBeenCalled()
  expect(prepare).not.toHaveBeenCalled()
  const website = await audit(input)
  expect(website.status).toBe('complete')
  expect(website.preparation).toEqual({ model: 'light-test', status: 'fallback' })
  expect(heavy).toHaveBeenCalledTimes(1)
  expect(website.evidence[0].text).toContain('Chez Léon')
})

it('sends separate selected excerpts to inference and stores the original evidence unchanged', async () => {
  const pages = await crawl(input.website!)
  const excerpts = ['Chez Léon', 'Retrouvez nos menus et nos services de réservation.']
  const heavy = vi.fn(infer)
  const result = await createLeadAuditor({ ...options, infer: heavy, lightModel: 'light-test',
    crawl: async () => pages, prepare: async original => original.map(page => ({ ...page, excerpts })),
  })(input)
  expect(result.status).toBe('complete')
  expect(result.preparation?.status).toBe('complete')
  expect(heavy.mock.calls[0][0]).toMatchObject({ evidence: [{ excerpts, truncated: false }] })
  expect((heavy.mock.calls[0][0] as { evidence: object[] }).evidence[0]).not.toHaveProperty('text')
  expect(result.evidence).toEqual(pages)
  expect(result.evidence[0]).not.toHaveProperty('excerpts')
})
