/** Explicit live Ollama smoke check using synthetic HTML, never real business pages.
 * This script is separate from the network-free unit suite: npm run ai:evaluate.
 */
import { existsSync, readFileSync } from 'node:fs'
import { createEvidenceCrawler } from '../src/core/audit/crawl'
import { createLeadAuditor } from '../src/core/audit/audit-lead'
import { createOllamaAudit } from '../src/core/audit/ollama'
import { createEvidencePreparer } from '../src/core/audit/prepare-evidence'
import { readAuditConfig } from '../src/server/audit-config'
import { loadPromptProfile, profileInstructions } from '../src/server/prompt-profile'
async function main() {
  if (existsSync('.env')) process.loadEnvFile('.env')
  const config = readAuditConfig({ ...process.env, AI_AUDIT_ENABLED: 'true' })!
  const { profile, revision } = loadPromptProfile()
  const metrics: object[] = []
  const instrumented: typeof fetch = async (url, init) => {
    const started = Date.now()
    const response = await fetch(url, init)
    const data = await response.clone().json()
    metrics.push({ model: JSON.parse(String(init?.body)).model, seconds: (Date.now() - started) / 1000, done: data.done, reason: data.done_reason, tokens: data.eval_count })
    return response
  }
  const light = { baseUrl: config.OLLAMA_BASE_URL, model: config.OLLAMA_LIGHT_MODEL, timeoutMs: config.OLLAMA_LIGHT_TIMEOUT_MS,
    numCtx: config.OLLAMA_LIGHT_NUM_CTX, numPredict: config.OLLAMA_LIGHT_NUM_PREDICT, keepAlive: '5m', language: config.AI_AUDIT_LANGUAGE,
    think: config.OLLAMA_LIGHT_THINK, fetchFn: instrumented }
  const heavy = { ...light, model: config.OLLAMA_MODEL, timeoutMs: config.OLLAMA_TIMEOUT_MS,
    numCtx: config.OLLAMA_NUM_CTX, numPredict: config.OLLAMA_NUM_PREDICT, think: config.OLLAMA_THINK }
  const html = readFileSync('fixtures/audit-home.html', 'utf8')
  const audit = createLeadAuditor({ model: heavy.model, lightModel: light.model, language: config.AI_AUDIT_LANGUAGE,
    promptProfile: { id: profile.id, revision }, opportunityThreshold: 60, minRating: 0, minReviews: 0, maxReviews: 1000000, excludeEcommerce: false,
    crawl: createEvidenceCrawler({ maxPages: 1, timeoutMs: 1000, maxBytes: 200000, maxChars: 6000, delayMs: 0,
      lookup: async () => ['93.184.216.34'], fetchFn: async url => String(url).endsWith('robots.txt') ? new Response('') : new Response(html, { headers: { 'Content-Type': 'text/html' } }) }),
    prepare: createEvidencePreparer({ ...light, taskPrompt: profileInstructions(profile, 'evidenceSelection') }),
    profileInfer: createOllamaAudit({ ...light, taskPrompt: profileInstructions(profile, 'leadSummary') }),
    infer: createOllamaAudit({ ...heavy, taskPrompt: profileInstructions(profile, 'websiteAudit') }),
  })
  const input = { name: 'Chez Léon', address: 'Route de Philippeville 102, 6280 Gerpinnes', phone: '+32 71 12 34 56', website: 'https://restaurant.example', presence: 'alive' as const, category: 'restaurant', rating: 4.5, reviewCount: 50 }
  const website = await audit(input)
  console.log(JSON.stringify({ stage: 'website', status: website.status, preparation: website.preparation, quality: website.websiteQuality, findings: website.findings.length, reason: website.reason, metrics }))
  const summary = await audit({ ...input, website: null, presence: 'none' })
  console.log(JSON.stringify({ stage: 'profile', status: summary.status, model: summary.model, quality: summary.websiteQuality, reason: summary.reason, metrics }))
  if (website.status !== 'complete' || summary.status !== 'complete' || website.preparation?.status !== 'complete') process.exitCode = 1
}
main().catch(error => { console.error(error); process.exitCode = 1 })
