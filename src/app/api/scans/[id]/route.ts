import { eq } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { scans } from '@/db/schema'

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const db = await getDb()
  const row = (await db.select().from(scans).where(eq(scans.id, id)))[0]
  if (!row) return Response.json({ error: 'Scan not found' }, { status: 404 })
  return Response.json(row)
}
