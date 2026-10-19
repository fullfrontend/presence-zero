import { loadPromptProfile } from '@/server/prompt-profile'
import { readAuditConfig } from '@/server/audit-config'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { settings } from '@/db/schema'
import { putSettingsSchema } from '@/server/validation'

const MASK = '***'

export async function GET() {
  const db = await getDb()
  const rows = await db.select().from(settings)
  const has = (key: string) => rows.some(r => r.key === key)
  let aiAudit: { enabled: boolean; model?: string; lightModel?: string; profile?: string; language?: string; error?: string } = { enabled: false }
  try {
    const config = readAuditConfig()
    if (config) aiAudit = { enabled: true, profile: loadPromptProfile().profile.id, model: config.OLLAMA_MODEL, lightModel: config.OLLAMA_LIGHT_MODEL, language: config.AI_AUDIT_LANGUAGE }
  } catch { aiAudit = { enabled: false, error: 'Invalid AI audit environment configuration.' } }
  // Never return stored secret values — presence only.
  return Response.json({
    aiAudit,
    searxngEnabled: !!process.env.SEARXNG_URL?.trim(),
    googleApiKey: process.env.GOOGLE_PLACES_API_KEY?.trim() || rows.some(r => r.key === 'google_api_key' && r.value.trim()) ? MASK : null,
    apifyToken: has('apify_token') ? MASK : null,
    braveSearchApiKey: has('brave_search_api_key') || process.env.BRAVE_SEARCH_API_KEY ? MASK : null,
  })
}

export async function PUT(req: Request) {
  const parsed = putSettingsSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 })
  const db = await getDb()
  const updates: [string, string][] = []
  if (parsed.data.googleApiKey) updates.push(['google_api_key', parsed.data.googleApiKey])
  if (parsed.data.apifyToken) updates.push(['apify_token', parsed.data.apifyToken])
  if (parsed.data.braveSearchApiKey === '') await db.delete(settings).where(eq(settings.key, 'brave_search_api_key'))
  else if (parsed.data.braveSearchApiKey) updates.push(['brave_search_api_key', parsed.data.braveSearchApiKey])
  for (const [key, value] of updates) {
    await db.insert(settings).values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value } })
  }
  return Response.json({ ok: true })
}
