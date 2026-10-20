import { z } from 'zod'
import { settingFields } from '@/config/settings'
import { auditConfigSchema } from './audit-config'

const positiveMs = z.string().regex(/^\d+$/).refine(v => Number(v) >= 1 && Number(v) <= 3600000)
const httpUrl = z.string().url().refine(value => {
  const url = new URL(value)
  return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash
})
const extra: Record<string, z.ZodType> = {
  PRESENCEZERO_DEFAULT_LOCATION: z.string().max(200),
  PRESENCEZERO_DEFAULT_COUNTRY_CODE: z.string().regex(/^[a-z]{2}$/),
  PRESENCEZERO_DEFAULT_LOCALE: z.enum(['fr-FR', 'en-US']),
  PRESENCEZERO_BATCH_SIZE: z.string().regex(/^\d+$/).refine(v => Number(v) >= 1 && Number(v) <= 1000),
  SEARXNG_ENABLED: z.enum(['true', 'false']),
  BRAVE_SEARCH_ENABLED: z.enum(['true', 'false']),
  AI_AUDIT_ENABLED: z.enum(['true', 'false']),
  SEARXNG_URL: z.union([httpUrl, z.literal('')]),
  SEARXNG_MIN_INTERVAL_MS: positiveMs,
  SEARXNG_COOLDOWN_MS: positiveMs,
  AI_PROMPT_PROFILE: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,63}$/),
}
for (const field of settingFields) {
  if (field.key.startsWith('PRESENCEZERO_CONCURRENCY_')) extra[field.key] = z.string().regex(/^\d+$/).refine(v => Number(v) >= 1 && Number(v) <= 16)
}
const auditFields: Record<string, z.ZodType> = auditConfigSchema.shape
export const configurationPatchSchema = z.record(z.string(), z.string().max(500).nullable()).superRefine((patch, ctx) => {
  for (const [key, value] of Object.entries(patch)) {
    if (!settingFields.some(field => field.key === key)) {
      ctx.addIssue({ code: 'custom', path: [key], message: 'Unknown setting' })
    } else if (value !== null && !(extra[key] ?? auditFields[key]).safeParse(value).success) {
      ctx.addIssue({ code: 'custom', path: [key], message: 'Invalid value' })
    }
  }
})
