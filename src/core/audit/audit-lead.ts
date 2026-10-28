import { summarizeSeo } from './seo'
import type { LighthouseRun } from './technical-types'
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
  lighthouse?: (website: string) => Promise<LighthouseRun[]>
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
    const started = now()
    const timings = { crawlMs: 0, lighthouseMs: 0, preparationMs: 0, inferenceMs: 0, totalMs: 0 }
    async function measure<T>(key: 'crawlMs' | 'preparationMs' | 'inferenceMs', run: () => Promise<T>): Promise<T> {
      const start = now()
      try { return await run() } finally { timings[key] = now() - start }
    }
    const mode = input.presence === 'alive' && input.website ? 'website' : 'profile'
    const report: AuditReport = {
      timings, version: 1, status: 'failed', mode, model: mode === 'profile' ? options.lightModel ?? options.model : options.model, language: options.language,
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
        const crawlStart = now()
        report.evidence = [...await measure('crawlMs', () => options.crawl(input.website!))]
        timings.crawlMs = now() - crawlStart
        report.seo = summarizeSeo(report.evidence)
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
      if (mode === 'website') {
        // Keep deterministic technical evidence available even if inference subsequently fails.
        if (report.seo) {
          const checks = report.seo.checks.map(check => `${check.evidenceId}: SEO ${check.label} [${check.status}]: ${check.detail}`)
          const text = checks.join('\n')
          report.evidence.push({ id: 'seo-summary', requestedUrl: input.website!, url: input.website!, retrievedAt: report.createdAt,
            statusCode: null, contentType: 'application/json', sha256: createHash('sha256').update(text).digest('hex'),
            text, facts: checks, truncated: false, error: null })
        }
        if (options.lighthouse) {
          const measurementStart = now()
          try { report.lighthouse = await options.lighthouse(input.website!) }
          catch { report.lighthouse = [{ status: 'unavailable', strategy: 'mobile', checkedAt: report.createdAt, durationMs: now() - measurementStart, requestedUrl: input.website!, reason: 'lighthouse_unavailable' }] }
          timings.lighthouseMs = now() - measurementStart
          for (const run of report.lighthouse) {
            const facts = run.status === 'complete'
              ? [`Lighthouse ${run.strategy} LAB scores (higher is better): ${JSON.stringify(run.scores)}`,
                `Lighthouse ${run.strategy} LAB metrics: ${JSON.stringify(run.metrics)}. LCP/FCP/TBT/Speed Index are milliseconds; CLS is unitless. TBT is not INP.`,
                ...(run.opportunities ?? []).map(item => `Lighthouse ${item.id}: ${item.title} ${item.detail}`)]
              : [`Lighthouse ${run.strategy} unavailable: ${run.reason}. No performance or SEO conclusion can be drawn from this failure.`]
            const text = facts.join('\n')
            report.evidence.push({ id: `lighthouse-${run.strategy}`, requestedUrl: run.requestedUrl, url: run.finalUrl ?? run.requestedUrl,
              retrievedAt: run.checkedAt, statusCode: null, contentType: 'application/json', sha256: createHash('sha256').update(text).digest('hex'),
              text, facts, truncated: false, error: null })
          }
        }
      }
      const usable = report.evidence.filter(page => !page.error)
      let prepared: PreparedEvidence[] = usable
      if (mode === 'website' && options.prepare) {
        try {
          const prepareStart = now()
          const htmlPages = usable.filter(page => page.contentType !== 'application/json')
          prepared = [...await measure('preparationMs', () => options.prepare!(htmlPages)), ...usable.filter(page => page.contentType === 'application/json')]
          timings.preparationMs = now() - prepareStart
          report.preparation = { model: options.lightModel ?? options.model, status: 'complete' }
        } catch {
          // Preparation is an optimization. Original bounded evidence remains valid.
          report.preparation = { model: options.lightModel ?? options.model, status: 'fallback' }
        }
      }
      // Heavy models select stable IDs; the application supplies verbatim quotations.
      const citationCatalog = prepared.flatMap(page => {
        const passages = page.excerpts ?? page.text.split(/(?<=[.!?])\s+/).slice(0, 8)
        return [...page.facts.slice(0, 24), ...passages.slice(0, 8)]
          .map(quote => cleanText(quote).slice(0, 500)).filter(quote => quote.length >= 8)
          .map((quote, index) => ({ quoteId: `${page.id}:q${index}`, evidenceId: page.id, quote }))
      }).slice(0, 150)
      const infer = mode === 'profile' ? options.profileInfer ?? options.infer : options.infer
      const inferStart = now()
      const result = await measure('inferenceMs', () => infer({ mode, assessedAt: report.createdAt, business: input, verification: report.verification, citationCatalog,
        evidence: prepared.map(({ id, text, excerpts, facts, truncated }) => ({ id, ...(excerpts ? { excerpts } : { text }), facts, truncated })) }))
      timings.inferenceMs = now() - inferStart
      if (mode === 'website' && result.websiteQuality === null) throw new Error('missing_quality')
      if (mode === 'profile' && result.websiteQuality !== null) throw new Error('unsupported_quality')
      const findings = result.findings.map(finding => {
        if (finding.quoteId) {
          const citation = citationCatalog.find(item => item.quoteId === finding.quoteId)
          if (!citation) throw new Error('ungrounded_finding')
          return { observation: finding.observation, recommendation: finding.recommendation, evidenceId: citation.evidenceId, quote: citation.quote }
        }
        return { observation: finding.observation, recommendation: finding.recommendation, evidenceId: finding.evidenceId, quote: finding.quote }
      }).filter(finding => !/^Declared generator:/i.test(finding.quote.trim()))
      // A generator name alone cannot substantiate a business recommendation.
      // Reject unsupported references/quotes instead of publishing a plausible hallucination.
      for (const finding of findings) {
        const page = usable.find(p => p.id === finding.evidenceId)
        if (!page || ![page.text, ...page.facts].some(value => cleanText(value).includes(cleanText(finding.quote)))) throw new Error('ungrounded_finding')
      }
      if (mode === 'website' && findings.length === 0) throw new Error('missing_evidence_findings')
      const opportunityScore = mode === 'website' ? 100 - result.websiteQuality! : null
      const qualified = opportunityScore !== null && opportunityScore >= options.opportunityThreshold
      return { ...report, ...result, findings, status: 'complete', opportunityScore, qualified,
        qualificationReasons: mode === 'website'
          ? [`Audit opportunity ${opportunityScore}/100; configured threshold ${options.opportunityThreshold}/100. Review the cited evidence before acting.`]
          : ['Profile summary only. The existing lead score and presence status remain authoritative.'] }
    } catch (error) {
      const failureCode = error instanceof Error && /^(missing_quality|unsupported_quality|ungrounded_finding|missing_evidence_findings|ollama_output_truncated|ollama_schema_invalid|ollama_response_too_large|ollama_http_\d{3})$/.test(error.message) ? error.message : 'audit_unavailable'
      return { ...report, failureCode, status: 'failed', reason: 'Audit unavailable or model output invalid/unsupported. Presence and lead score are unchanged. Check Ollama configuration and re-run the scan.' }
    } finally { timings.totalMs = now() - started }
  }
}
