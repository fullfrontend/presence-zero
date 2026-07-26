import { inArray } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { businesses } from '@/db/schema'
import { bulkPatchBusinessesSchema } from '@/server/validation'

export async function PATCH(req: Request) {
  const parsed = bulkPatchBusinessesSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 })
  const { ids, leadStatus } = parsed.data
  const db = await getDb()
  await db.update(businesses)
    .set({ leadStatus, statusUpdatedAt: new Date() })
    .where(inArray(businesses.id, ids))
  return Response.json({ updated: ids.length, leadStatus })
}
