import Link from 'next/link'
import { desc } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { scans } from '@/db/schema'
import NewScanForm from '@/components/app/new-scan-form'
import { SectionTag } from '@/components/brand/section-tag'
import { HeadlineRule } from '@/components/brand/headline-rule'

export const dynamic = 'force-dynamic'

export default async function AppHome() {
  const db = await getDb()
  const rows = await db.select().from(scans).orderBy(desc(scans.createdAt))
  return (
    <div className="space-y-12">
      <section>
        <SectionTag>{'// NEW SCAN'}</SectionTag>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Find businesses whose web presence is <span className="text-lime">zero</span>.</h1>
        <HeadlineRule />
        <div className="mt-8"><NewScanForm /></div>
      </section>
      <section>
        <SectionTag>{'// PAST SCANS'}</SectionTag>
        {rows.length === 0 && <p className="mt-3 text-sm text-dim">No scans yet.</p>}
        <ul className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line">
          {rows.map(s => (
            <li key={s.id}>
              <Link href={`/app/scans/${s.id}`} className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-surface">
                <span className="text-text">{s.category} <span className="text-mute">in</span> {s.location}</span>
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-mute">{s.status} · {s.totalFound} found</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
