import type { Metadata } from 'next'
import { DEMO_SCAN } from '@/lib/demo-data'
import ResultsTable from '@/components/app/results-table'
import { SectionTag } from '@/components/brand/section-tag'

export const metadata: Metadata = {
  title: 'Live demo',
  description: 'Explore a real PresenceZero result set — scored local-business leads with available domains. Read-only; self-host to run your own scans.',
}

export default function DemoPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <SectionTag>{'// LIVE DEMO — READ ONLY'}</SectionTag>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">{DEMO_SCAN.category} <span className="text-mute">in</span> {DEMO_SCAN.location}</h1>
      <p className="mt-3 max-w-2xl text-sm text-dim">A real scored result set. Filtering and sorting work; scanning and editing are disabled. <a href="https://github.com/its-tahir/presence-zero" className="text-lime underline-offset-4 hover:underline">Self-host</a> to run your own.</p>
      <div className="mt-8"><ResultsTable scanId="demo" readOnly initialResults={DEMO_SCAN.results} /></div>
    </main>
  )
}
