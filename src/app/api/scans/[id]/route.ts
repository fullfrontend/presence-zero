import { eq } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { scans } from '@/db/schema'
import { patchScanSchema } from '@/server/validation'

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const db = await getDb()
  const row = (await db.select().from(scans).where(eq(scans.id, id)))[0]
  if (!row) return Response.json({ error: 'Scan not found' }, { status: 404 })
  return Response.json(row)
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const parsed = patchScanSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 })
  const db = await getDb()
  const existing = (await db.select().from(scans).where(eq(scans.id, id)))[0]
  if (!existing) return Response.json({ error: 'Scan not found' }, { status: 404 })
  await db.update(scans).set(parsed.data).where(eq(scans.id, id))
  const updated = (await db.select().from(scans).where(eq(scans.id, id)))[0]
  return Response.json(updated)
}
