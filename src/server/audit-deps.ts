import { loadPromptProfile, profileInstructions } from './prompt-profile'
import { createEvidencePreparer } from '@/core/audit/prepare-evidence'
import { createEvidenceCrawler } from '@/core/audit/crawl'
import { createLeadAuditor } from '@/core/audit/audit-lead'
import { createOllamaAudit } from '@/core/audit/ollama'
import { readAuditConfig } from './audit-config'

export function buildAuditLead(env: Record<string, string | undefined> = process.env) {
  const config = readAuditConfig(env)
  if (!config) return undefined
  const { profile, revision } = loadPromptProfile(env)
  const light = {
    baseUrl: config.OLLAMA_BASE_URL, model: config.OLLAMA_LIGHT_MODEL,
    timeoutMs: config.OLLAMA_LIGHT_TIMEOUT_MS, numCtx: config.OLLAMA_LIGHT_NUM_CTX,
    numPredict: config.OLLAMA_LIGHT_NUM_PREDICT, keepAlive: config.OLLAMA_KEEP_ALIVE,
    language: config.AI_AUDIT_LANGUAGE, think: config.OLLAMA_LIGHT_THINK,
  }
  return createLeadAuditor({
    promptProfile: { id: profile.id, revision },
    lightModel: config.OLLAMA_LIGHT_MODEL,
    profileInfer: createOllamaAudit({ ...light, taskPrompt: profileInstructions(profile, 'leadSummary') }),
    ...(config.AI_AUDIT_PREPARE_EVIDENCE ? { prepare: createEvidencePreparer({ ...light, taskPrompt: profileInstructions(profile, 'evidenceSelection') }) } : {}),
    model: config.OLLAMA_MODEL, language: config.AI_AUDIT_LANGUAGE,
    opportunityThreshold: config.AI_AUDIT_OPPORTUNITY_THRESHOLD,
    minRating: config.AI_AUDIT_MIN_RATING, minReviews: config.AI_AUDIT_MIN_REVIEWS,
    maxReviews: config.AI_AUDIT_MAX_REVIEWS, excludeEcommerce: config.AI_AUDIT_EXCLUDE_ECOMMERCE,
    excludeChains: config.AI_AUDIT_EXCLUDE_CHAINS, minBusinessAgeYears: config.AI_AUDIT_MIN_BUSINESS_AGE_YEARS,
    crawl: createEvidenceCrawler({
      maxPages: config.AI_AUDIT_MAX_PAGES, timeoutMs: config.AI_AUDIT_PAGE_TIMEOUT_MS,
      maxBytes: config.AI_AUDIT_MAX_PAGE_BYTES, maxChars: config.AI_AUDIT_MAX_PAGE_CHARS,
      delayMs: config.AI_AUDIT_PAGE_DELAY_MS,
    }),
    infer: createOllamaAudit({
      taskPrompt: profileInstructions(profile, 'websiteAudit'),
      baseUrl: config.OLLAMA_BASE_URL, model: config.OLLAMA_MODEL,
      timeoutMs: config.OLLAMA_TIMEOUT_MS, numCtx: config.OLLAMA_NUM_CTX,
      numPredict: config.OLLAMA_NUM_PREDICT, keepAlive: config.OLLAMA_KEEP_ALIVE,
      language: config.AI_AUDIT_LANGUAGE, think: config.OLLAMA_THINK,
    }),
  })
}
