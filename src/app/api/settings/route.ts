import { loadPromptProfile } from '@/server/prompt-profile'
import { readAuditConfig } from '@/server/audit-config'
import { loadRuntimeSettings, resolveSettings, secretFields } from '@/server/runtime-settings'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { settings } from '@/db/schema'
import { putSettingsSchema } from '@/server/validation'

export async function GET() {
  const { env, configuration, secrets } = await loadRuntimeSettings(await getDb())
  let aiAudit: { enabled: boolean; model?: string; lightModel?: string; profile?: string; language?: string; error?: string } = { enabled: false }
  try {
    const config = readAuditConfig(env)
    if (config) aiAudit = { enabled: true, profile: loadPromptProfile(env).profile.id, model: config.OLLAMA_MODEL, lightModel: config.OLLAMA_LIGHT_MODEL, language: config.AI_AUDIT_LANGUAGE }
  } catch { aiAudit = { enabled: false, error: 'Invalid AI audit environment configuration.' } }
  // Explicit allowlist only: never serialize the resolved environment or private profiles.
  return Response.json({
    configuration, secrets, aiAudit,
    searxngEnabled: env.SEARXNG_ENABLED === 'true' && !!env.SEARXNG_URL?.trim(),
    braveSearchEnabled: env.BRAVE_SEARCH_ENABLED === 'true' && secrets.braveSearchApiKey.configured,
    googleApiKey: secrets.googleApiKey.configured ? '***' : null,
    apifyToken: secrets.apifyToken.configured ? '***' : null,
    braveSearchApiKey: secrets.braveSearchApiKey.configured ? '***' : null,
  })
}

export async function PUT(req: Request) {
  const parsed = putSettingsSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return Response.json({ error: 'Invalid settings.', fields: parsed.error.issues.map(issue => issue.path.join('.')) }, { status: 400 })
  const updates: [string, string | null][] = Object.entries(parsed.data.configuration ?? {}).map(([key, value]) => [`config:${key}`, value])
  for (const [name, field] of Object.entries(secretFields)) {
    const value = parsed.data[name as keyof typeof secretFields]
    if (value !== undefined) updates.push([field.key, value])
  }
  const db = await getDb()
  const rows = new Map((await db.select().from(settings)).map(row => [row.key, row.value]))
  for (const [key, value] of updates) {
    if (value === null) rows.delete(key)
    else rows.set(key, value)
  }
  const { env } = resolveSettings(Array.from(rows, ([key, value]) => ({ key, value })))
  // Unrelated settings remain editable even if deployment AI settings need repair.
  const changesAi = Object.keys(parsed.data.configuration ?? {}).some(key => key.startsWith('AI_') || key.startsWith('OLLAMA_'))
  if (changesAi) {
    try {
      if (readAuditConfig(env)) loadPromptProfile(env)
    } catch {
      return Response.json({ error: 'Check the AI models, limits and private profile before enabling AI.', fields: ['configuration.AI_AUDIT_ENABLED'] }, { status: 400 })
    }
  }
  // A transactional batch keeps mixed credential/configuration updates atomic and
  // works with both in-memory libSQL and persistent deployments.
  const statements = updates.map(([key, value]) => value === null
    ? db.delete(settings).where(eq(settings.key, key))
    : db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } }))
  const [first, ...rest] = statements
  if (first) await db.batch([first, ...rest])
  return Response.json({ ok: true })
}
