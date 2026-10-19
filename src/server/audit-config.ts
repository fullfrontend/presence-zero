import { z } from 'zod'

const integer = (fallback: number, min: number, max: number) => z.preprocess(
  value => value === undefined || value === '' ? fallback : Number(value), z.number().int().min(min).max(max),
)
const bool = (fallback: boolean) => z.preprocess(
  value => value === undefined || value === '' ? fallback : value === 'true' ? true : value === 'false' ? false : value,
  z.boolean(),
)
export const auditConfigSchema = z.object({
  OLLAMA_BASE_URL: z.url().default('http://127.0.0.1:11434').refine(value => {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash
      && url.hostname !== 'ollama.com' && !url.hostname.endsWith('.ollama.com')
  }, 'Use your own local Ollama server URL without credentials, query or fragment'),
  OLLAMA_MODEL: z.string().trim().min(1).max(150).refine(value => !/cloud/i.test(value), 'Use a locally installed model'),
  OLLAMA_LIGHT_MODEL: z.string().trim().min(1).max(150).refine(value => !/cloud/i.test(value), 'Use a locally installed model').default('qwen3.5:4b-q4_K_M'),
  OLLAMA_LIGHT_TIMEOUT_MS: integer(60000, 1000, 900000),
  OLLAMA_LIGHT_NUM_CTX: integer(16384, 4096, 131072),
  OLLAMA_LIGHT_NUM_PREDICT: integer(2000, 256, 8192),
  OLLAMA_THINK: bool(false),
  OLLAMA_LIGHT_THINK: bool(false),
  AI_AUDIT_PREPARE_EVIDENCE: bool(true),
  OLLAMA_TIMEOUT_MS: integer(180000, 1000, 900000),
  OLLAMA_NUM_CTX: integer(16384, 4096, 131072),
  OLLAMA_NUM_PREDICT: integer(2500, 256, 8192),
  OLLAMA_KEEP_ALIVE: z.string().regex(/^(?:0|\d+[smh])$/).default('5m'),
  AI_AUDIT_LANGUAGE: z.string().regex(/^[a-z]{2,3}(?:-[A-Za-z]{2,8})?$/).default('fr'),
  AI_AUDIT_MAX_PAGES: integer(3, 1, 5),
  AI_AUDIT_PAGE_TIMEOUT_MS: integer(10000, 1000, 30000),
  AI_AUDIT_MAX_PAGE_BYTES: integer(200000, 10000, 500000),
  AI_AUDIT_MAX_PAGE_CHARS: integer(6000, 500, 12000),
  AI_AUDIT_PAGE_DELAY_MS: integer(1000, 0, 30000),
  AI_AUDIT_OPPORTUNITY_THRESHOLD: integer(60, 0, 100),
  AI_AUDIT_MIN_RATING: z.preprocess(v => v === undefined || v === '' ? 0 : Number(v), z.number().min(0).max(5)),
  AI_AUDIT_MIN_REVIEWS: integer(0, 0, 1000000),
  AI_AUDIT_MAX_REVIEWS: integer(1000000, 0, 1000000),
  AI_AUDIT_EXCLUDE_ECOMMERCE: bool(false),
  AI_AUDIT_EXCLUDE_CHAINS: bool(false),
  AI_AUDIT_MIN_BUSINESS_AGE_YEARS: integer(0, 0, 200),
})

export function readAuditConfig(env: Record<string, string | undefined> = process.env) {
  if (env.AI_AUDIT_ENABLED !== 'true') return null
  const result = auditConfigSchema.safeParse(env)
  if (!result.success) throw new Error(`Invalid AI audit configuration: ${result.error.issues.map(i => i.path.join('.')).join(', ')}`)
  if (result.data.AI_AUDIT_MIN_REVIEWS > result.data.AI_AUDIT_MAX_REVIEWS) throw new Error('AI_AUDIT_MIN_REVIEWS exceeds AI_AUDIT_MAX_REVIEWS')
  return result.data
}
export type AuditConfig = NonNullable<ReturnType<typeof readAuditConfig>>
