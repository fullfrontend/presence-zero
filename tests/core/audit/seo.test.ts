import { expect, it } from 'vitest'
import { inspectSeo, summarizeSeo } from '@/core/audit/seo'
import type { PageEvidence } from '@/core/audit/types'
it('finds observed indexing and markup issues without treating optional metadata as proof of poor ranking', () => {
  const seo = inspectSeo('<html><head><meta name="robots" content="noindex"><link rel="canonical" href="https://elsewhere.example"><script type="application/ld+json">{bad}</script></head><body><img src="x"><img alt="" src="decoration"><h1>Business</h1></body></html>', 'https://business.example/', false, new Headers(), 123)
  expect(seo.responseMs).toBe(123)
  expect(seo.checks.find(c => c.id === 'indexing')).toMatchObject({ status: 'warning' })
  expect(seo.checks.find(c => c.id === 'canonical')?.status).toBe('warning')
  expect(seo.checks.find(c => c.id === 'structured-data')?.status).toBe('warning')
  expect(seo.checks.find(c => c.id === 'image-alt')?.detail).toContain('1 image(s)')
})
it('does not assert missing fields on a truncated page and observes HTTP noindex headers', () => {
  const seo = inspectSeo('<html><head>', 'https://business.example/', true, new Headers({ 'x-robots-tag': 'noindex' }), 0)
  expect(seo.checks.find(c => c.id === 'title')?.status).toBe('unknown')
  expect(seo.checks.find(c => c.id === 'description')?.status).toBe('unknown')
  expect(seo.checks.find(c => c.id === 'indexing')?.status).toBe('warning')
  expect(seo.checks.find(c => c.id === 'canonical')?.status).toBe('unknown')
})
it('reports repeated metadata across sampled pages without a duplicate-content penalty claim', () => {
  const seo = inspectSeo('<title>Business</title><meta name="description" content="Same description">', 'https://business.example', false, new Headers(), 0)
  const page = { seo, error: null, truncated: false } as PageEvidence
  const result = summarizeSeo([{ ...page, id: 'page-1' }, { ...page, id: 'page-2' }])
  expect(result.pagesChecked).toBe(2)
  expect(result.checks.filter(c => c.id.startsWith('duplicate-'))).toHaveLength(2)
  expect(result.checks.find(c => c.id === 'duplicate-title')?.detail).toContain('not evidence of a search penalty')
})
