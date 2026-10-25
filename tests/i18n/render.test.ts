import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
import { LocaleProvider } from '@/i18n/client'
import { PresenceBadge } from '@/components/app/presence-badge'
import { AuditDetail } from '@/components/app/audit-detail'
import SettingsForm from '@/components/app/settings-form'

import type { Locale } from '@/i18n/config'
import type { AuditReport } from '@/core/audit/types'
function render(locale: Locale, child: React.ReactNode) {
  return renderToStaticMarkup(h(LocaleProvider, { locale, children: child }))
}
it('renders distinct locales in the same process without shared mutable language state', () => {
  expect(render('fr-FR', h(PresenceBadge, { status: 'not_found' }))).toContain('AUCUN SITE TROUVÉ')
  expect(render('en-US', h(PresenceBadge, { status: 'not_found' }))).toContain('NO SITE FOUND')
  expect(render('fr-FR', h(SettingsForm))).toContain('Clé API Google Places')
})
it('translates report controls but preserves model prose and collected evidence', () => {
  const report: AuditReport = { version: 1, status: 'complete', mode: 'profile', model: 'local', language: 'en-US',
    createdAt: '2026-10-19T00:00:00Z', reason: null, summary: 'Original generated summary.', brief: 'Original brief.',
    verification: { status: 'not_applicable', detail: 'Source listing context only; no website quality assessment.' },
    websiteQuality: null, opportunityScore: null, qualified: false, qualificationReasons: [], findings: [],
    evidence: [{ id: 'listing', requestedUrl: '', url: '', retrievedAt: '2026-10-19T00:00:00Z', statusCode: null,
      contentType: 'text/plain', sha256: 'hash', text: 'Settings <script>untrusted</script>', facts: [], truncated: false, error: null }] }
  const html = render('fr-FR', h(AuditDetail, { report }))
  expect(html).toContain('Télécharger le rapport')
  expect(html).toContain('Original generated summary.')
  expect(html).toContain('Settings &lt;script&gt;untrusted&lt;/script&gt;')
  expect(html).not.toContain('<script>untrusted</script>')
})

import ResultsTable from '@/components/app/results-table'
import { SAMPLE_SCAN } from '../fixtures/scan-results'
it('translates table headers and read-only statuses without altering company names or notes', () => {
  const html = render('fr-FR', h(ResultsTable, { scanId: 'demo', readOnly: true, initialResults: SAMPLE_SCAN.results }))
  expect(html).toContain('Entreprise')
  expect(html).toContain('Domaines disponibles')
  expect(html).toContain('contacté')
  expect(html).toContain('Stone Mill Artisan Bread')
  expect(html).toContain('Signed — 5-page site, build starts in Aug')
  expect(html).not.toContain('>Available domains<')
})

it('renders the dedicated configuration issue badge in both languages', () => {
  expect(render('fr-FR', h(PresenceBadge, { status: 'configuration_error' }))).toContain('PROBLÈME DE CONFIGURATION')
  expect(render('en-US', h(PresenceBadge, { status: 'configuration_error' }))).toContain('CONFIGURATION ISSUE')
})

import { LeadDetail } from '@/components/app/lead-detail'
it('shows listing discrepancy evidence in both locales without unsafe links', () => {
  const row = { name: 'Business', phone: null, rating: null, reviewCount: null, score: null, presenceStatus: 'alive', domains: [],
    listingIssue: { sourceWebsite: 'javascript:alert(1)', replacementWebsite: 'https://business.example', sourceUrl: null,
      sourceStatus: 'dead', sourceDetail: 'Returned HTTP 404.', matchDetail: 'Name and address match', checkedAt: '2026-10-21T12:00:00Z' } }
  const fr = render('fr-FR', h(LeadDetail, { row }))
  expect(fr).toContain('Lien de fiche à vérifier')
  expect(fr).toContain('https://business.example')
  expect(fr).not.toContain('href="javascript:')
  expect(render('en-US', h(LeadDetail, { row }))).toContain('Listing link to review')
})
