import { expect, it } from 'vitest'
import { explainBusinessScore } from '@/core/business-score'
const business = { name: 'Chez Léon', presenceStatus: 'not_found', phone: '123', reviewCount: 100, rating: 5 }
it('awards the same bounded domain contribution for national TLD or .com', () => {
  for (const domains of [ ['chezleon.be'], ['chezleon.com'], ['chezleon.be', 'chezleon.com'] ]) {
    const score = explainBusinessScore(business, domains.map(domain => ({ domain, available: true })), 'be')
    expect(score.total).toBe(100)
    expect(score.factors.find(f => f.key === 'exactDomain')?.points).toBe(5)
  }
})
it('requires a confirmed available exact name in the scan country or .com', () => {
  expect(explainBusinessScore(business, [{ domain: 'chezleon.fr', available: true }], 'be').total).toBe(95)
  expect(explainBusinessScore(business, [{ domain: 'chezleon.be', available: null }], 'be').total).toBe(95)
  expect(explainBusinessScore(business, [{ domain: 'chezleon.be', available: false }], 'be').total).toBe(95)
})
