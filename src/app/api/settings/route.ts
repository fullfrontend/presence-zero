import { eq } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { settings } from '@/db/schema'
import { putSettingsSchema } from '@/server/validation'

export async function GET() {
  const db = await getDb()
  const row = (await db.select().from(settings).where(eq(settings.key, 'google_api_key')))[0]
  return Response.json({ googleApiKey: row ? '***' : null })
}

export async function PUT(req: Request) {
  const parsed = putSettingsSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 })
  const db = await getDb()
  await db.insert(settings).values({ key: 'google_api_key', value: parsed.data.googleApiKey })
    .onConflictDoUpdate({ target: settings.key, set: { value: parsed.data.googleApiKey } })
  return Response.json({ ok: true })
}
