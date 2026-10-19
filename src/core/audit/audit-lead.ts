import { createHash } from 'node:crypto'
import { cleanText } from './crawl'
import type { AuditInput, AuditLead, AuditReport, PageEvidence } from './types'
import type { createOllamaAudit } from './ollama'
import type { PreparedEvidence } from './prepare-evidence'

const normalized = (value: string) => cleanText(value).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

export function verifyIdentity(input: AuditInput, pages: PageEvidence[]): AuditReport['verification'] {
  const name = normalized(input.name)
  for (const page of pages.filter(p => !p.error)) {
    const text = normalized(page.text)
    if (name.length < 4 || !(` ${text} `).includes(` ${name} `)) continue
    const phone = input.phone?.replace(/\D/g, '')
    const phoneMatch = phone && phone.length >= 9 && (page.text.match(/\+?\d[\d\s()./-]{7,}\d/g) ?? [])
      .some(candidate => candidate.replace(/\D/g, '').endsWith(phone.slice(-9)))
    const address = normalized(input.address ?? '')
    const numbers = address.match(/\b\d+\b/g) ?? []
    const words = address.split(' ').filter(word => word.length >= 4)
    const addressMatch = numbers.length > 0 && numbers.every(number => (` ${text} `).includes(` ${number} `))
      && words.length >= 2 && words.filter(word => (` ${text} `).includes(` ${word} `)).length >= 2
    if (phoneMatch || addressMatch) return { status: 'matched', detail: `Business name and ${phoneMatch ? 'phone' : 'address'} matched on ${page.id}. This is evidence of identity, not legal ownership verification.` }
  }
  return { status: 'unverified', detail: 'The sampled pages did not establish a matching business name plus phone or address. Website quality was not scored.' }
}

export interface LeadAuditOptions {
  model: string
  lightModel?: string
  promptProfile?: { id: string; revision: string }
  profileInfer?: ReturnType<typeof createOllamaAudit>
  prepare?: (pages: PageEvidence[]) => Promise<PreparedEvidence[]>
  language: string
  opportunityThreshold: number
  minRating: number
  minReviews: number
  maxReviews: number
  excludeEcommerce: boolean
  excludeChains?: boolean
  minBusinessAgeYears?: number
  crawl: (website: string) => Promise<PageEvidence[]>
  infer: ReturnType<typeof createOllamaAudit>
  now?: () => number
}

export function createLeadAuditor(options: LeadAuditOptions): AuditLead {
  const now = options.now ?? Date.now
  return async input => {
    const mode = input.presence === 'alive' && input.website ? 'website' : 'profile'
    const report: AuditReport = {
      version: 1, status: 'failed', mode, model: mode === 'profile' ? options.lightModel ?? options.model : options.model, language: options.language,
      createdAt: new Date(now()).toISOString(), reason: null,
      ...(options.promptProfile ? { promptProfile: options.promptProfile } : {}),
      verification: { status: mode === 'website' ? 'unverified' : 'not_applicable', detail: 'Source listing context only; no website quality assessment.' },
      summary: '', websiteQuality: null, opportunityScore: null, qualified: false,
      qualificationReasons: [], findings: [], brief: '', evidence: [],
    }
    if ((options.minRating > 0 && (input.rating === null || input.rating < options.minRating))
      || (options.minReviews > 0 && (input.reviewCount === null || input.reviewCount < options.minReviews))
      || (input.reviewCount !== null && input.reviewCount > options.maxReviews)) {
      return { ...report, status: 'skipped', reason: 'Outside configured rating/review limits.' }
    }
    try {
      if (mode === 'website') {
        report.evidence = await options.crawl(input.website!)
        report.verification = verifyIdentity(input, report.evidence)
        if (report.verification.status !== 'matched') return { ...report, status: 'unverified', reason: report.verification.detail }
        if (options.excludeEcommerce && report.evidence.some(p => !p.error && p.facts.includes('Cart and checkout links observed'))) {
          return { ...report, status: 'skipped', reason: 'Cart and checkout links observed; ecommerce excluded by configuration.' }
        }
        if (options.excludeChains && report.evidence.some(p => !p.error && p.facts.includes('Franchise or national-chain wording observed (heuristic)'))) {
          return { ...report, status: 'skipped', reason: 'Franchise/chain wording observed; excluded by configuration. This is a heuristic, review the evidence.' }
        }
        const foundedYears = report.evidence.filter(p => !p.error).flatMap(p => p.facts)
          .map(fact => /^Claimed establishment year: (\d{4})/.exec(fact)).filter(match => match !== null).map(match => Number(match[1]))
        if ((options.minBusinessAgeYears ?? 0) > 0 && foundedYears.length
          && new Date(now()).getUTCFullYear() - Math.max(...foundedYears) < options.minBusinessAgeYears!) {
          return { ...report, status: 'skipped', reason: 'The establishment year claimed on the website is more recent than the configured minimum business age.' }
        }
      } else {
        const text = cleanText(JSON.stringify({ name: input.name, category: input.category, address: input.address,
          presence: input.presence, website: input.website, rating: input.rating, reviewCount: input.reviewCount }))
        report.evidence = [{ id: 'listing', requestedUrl: '', url: '', retrievedAt: report.createdAt,
          statusCode: null, contentType: 'application/json', sha256: createHash('sha256').update(text).digest('hex'),
          text, facts: [], truncated: false, error: null }]
      }
      const usable = report.evidence.filter(page => !page.error)
      let prepared: PreparedEvidence[] = usable
      if (mode === 'website' && options.prepare) {
        try {
          prepared = await options.prepare(usable)
          report.preparation = { model: options.lightModel ?? options.model, status: 'complete' }
        } catch {
          // Preparation is an optimization. Original bounded evidence remains valid.
          report.preparation = { model: options.lightModel ?? options.model, status: 'fallback' }
        }
      }
      const infer = mode === 'profile' ? options.profileInfer ?? options.infer : options.infer
      const result = await infer({ mode, business: input, verification: report.verification,
        evidence: prepared.map(({ id, text, excerpts, facts, truncated }) => ({ id, ...(excerpts ? { excerpts } : { text }), facts, truncated })) })
      if (mode === 'website' && result.websiteQuality === null) throw new Error('missing_quality')
      if (mode === 'profile' && result.websiteQuality !== null) throw new Error('unsupported_quality')
      // Reject unsupported references/quotes instead of publishing a plausible hallucination.
      for (const finding of result.findings) {
        const page = usable.find(p => p.id === finding.evidenceId)
        if (!page || !cleanText([page.text, ...page.facts].join(' ')).includes(cleanText(finding.quote))) throw new Error('ungrounded_finding')
      }
      if (mode === 'website' && result.findings.length === 0) throw new Error('missing_evidence_findings')
      const opportunityScore = mode === 'website' ? 100 - result.websiteQuality! : null
      const qualified = opportunityScore !== null && opportunityScore >= options.opportunityThreshold
      return { ...report, ...result, status: 'complete', opportunityScore, qualified,
        qualificationReasons: mode === 'website'
          ? [`Audit opportunity ${opportunityScore}/100; configured threshold ${options.opportunityThreshold}/100. Review the cited evidence before acting.`]
          : ['Profile summary only. The existing lead score and presence status remain authoritative.'] }
    } catch {
      return { ...report, status: 'failed', reason: 'Audit unavailable or model output invalid/unsupported. Presence and lead score are unchanged. Check Ollama configuration and re-run the scan.' }
    }
  }
}
