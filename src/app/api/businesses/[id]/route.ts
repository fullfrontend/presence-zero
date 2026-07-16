import { eq } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { businesses } from '@/db/schema'
import { patchBusinessSchema } from '@/server/validation'

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const parsed = patchBusinessSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 })
  const db = await getDb()
  const existing = (await db.select().from(businesses).where(eq(businesses.id, id)))[0]
  if (!existing) return Response.json({ error: 'Business not found' }, { status: 404 })
  await db.update(businesses).set({ ...parsed.data, statusUpdatedAt: new Date() }).where(eq(businesses.id, id))
  const updated = (await db.select().from(businesses).where(eq(businesses.id, id)))[0]
  return Response.json(updated)
}
