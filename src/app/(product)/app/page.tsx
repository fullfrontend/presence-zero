import Link from 'next/link'
import { desc } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { scans } from '@/db/schema'
import NewScanForm from '@/components/new-scan-form'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const db = await getDb()
  const rows = await db.select().from(scans).orderBy(desc(scans.createdAt))
  return (
    <div className="space-y-8">
      <section>
        <h1 className="mb-1 text-2xl font-bold">New scan</h1>
        <p className="mb-4 text-sm text-zinc-600">Find businesses whose web presence is zero.</p>
        <NewScanForm />
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold">Past scans</h2>
        {rows.length === 0 && <p className="text-sm text-zinc-500">No scans yet.</p>}
        <ul className="divide-y rounded border bg-white">
          {rows.map(s => (
            <li key={s.id}>
              <Link href={`/app/scans/${s.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50">
                <span>{s.category} in {s.location}</span>
                <span className="text-sm text-zinc-500">{s.status} · {s.totalFound} found</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
