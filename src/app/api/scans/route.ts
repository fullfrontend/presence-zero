import { randomUUID } from 'node:crypto'
import { desc } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { scans } from '@/db/schema'
import { createScanSchema } from '@/server/validation'

export async function POST(req: Request) {
  const parsed = createScanSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }
  const { location, category, countryCode, provider, csvContent } = parsed.data
  const db = await getDb()
  const id = randomUUID()
  await db.insert(scans).values({
    id, createdAt: new Date(), location, category, countryCode, provider,
    providerConfig: csvContent ? JSON.stringify({ csvContent }) : null,
  })
  return Response.json({ id }, { status: 201 })
}

export async function GET() {
  const db = await getDb()
  const rows = await db.select().from(scans).orderBy(desc(scans.createdAt))
  return Response.json({ scans: rows })
}
