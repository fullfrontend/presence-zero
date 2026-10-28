/** Explicit live check, separate from the network-free test suite. */
import { existsSync, mkdirSync, writeFileSync, readFileSync, statSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { createEvidenceCrawler } from '../src/core/audit/crawl'
import { createLighthouseRunner, parseLighthouseReport } from '../src/core/audit/lighthouse'
import { summarizeSeo } from '../src/core/audit/seo'
import { createWebsiteProbe } from '../src/core/probes/website-probe'
import { getDb } from '../src/db/client'
import { loadRuntimeSettings } from '../src/server/runtime-settings'
import { buildAuditLead } from '../src/server/audit-deps'

async function main() {
  if (existsSync('.env')) process.loadEnvFile('.env')
  const { values } = parseArgs({ options: { 'lighthouse-report': { type: 'string' }, url: { type: 'string' }, name: { type: 'string' }, phone: { type: 'string' }, address: { type: 'string' }, ai: { type: 'boolean' }, device: { type: 'string', default: 'mobile' } } })
  if (!values.url || !['mobile', 'desktop', 'both'].includes(values.device!)) throw new Error('Usage: npm run audit:website -- --url https://example.com --device mobile [--ai --name Business --phone Number --address Address]')
  const db = await getDb()
  const { env } = await loadRuntimeSettings(db)
  let imported: ReturnType<typeof parseLighthouseReport> | undefined
  if (values['lighthouse-report']) {
    if (statSync(values['lighthouse-report']).size > 10_000_000) throw new Error('Lighthouse report exceeds 10 MB')
    const lhr = JSON.parse(readFileSync(values['lighthouse-report'], 'utf8'))
    const strategy = lhr.configSettings?.formFactor
    if (!['mobile', 'desktop'].includes(strategy) || !Number.isFinite(Date.parse(lhr.fetchTime))) throw new Error('Missing Lighthouse device or timestamp')
    imported = parseLighthouseReport(lhr, values.url, { strategy, checkedAt: lhr.fetchTime, requestedUrl: values.url, durationMs: lhr.timing?.total ?? 0 })
  }
  const started = Date.now()
  let result: unknown
  try {
    if (values.ai) {
      if (!values.name) throw new Error('--name is required for an identity-verified AI audit')
      const probe = await createWebsiteProbe()(values.url)
      const audit = buildAuditLead({ ...env, AI_AUDIT_ENABLED: 'true', AI_AUDIT_LIGHTHOUSE_ENABLED: 'true', AI_AUDIT_LIGHTHOUSE_STRATEGY: values.device }, imported ? { lighthouse: async () => [imported!] } : {})!
      result = await audit({ name: values.name, address: values.address ?? null, phone: values.phone ?? null, category: null,
        rating: null, reviewCount: null, website: values.url, presence: probe.status })
    } else {
      const crawl = createEvidenceCrawler({ maxPages: 3, timeoutMs: 10000, maxBytes: 200000, maxChars: 6000, delayMs: 1000 })
      const pages = await crawl(values.url)
      const lighthouse = imported ? [imported] : await createLighthouseRunner({ apiKey: env.PAGESPEED_API_KEY, strategy: values.device as 'mobile' | 'desktop' | 'both', timeoutMs: 90000 })(values.url)
      result = { website: values.url, checkedAt: new Date().toISOString(), seo: summarizeSeo(pages), lighthouse, evidence: pages, elapsedMs: Date.now() - started }
    }
    mkdirSync('.local-audits', { recursive: true })
    const path = `.local-audits/audit-${Date.now()}.json`
    writeFileSync(path, JSON.stringify(result, null, 2))
    console.log(JSON.stringify({ report: path, elapsedSeconds: (Date.now() - started) / 1000 }))
  } finally { db.$client.close() }
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Audit failed'); process.exitCode = 1 })
