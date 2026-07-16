import ScanRunner from '@/components/app/scan-runner'
import { SectionTag } from '@/components/brand/section-tag'

export default async function ScanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div className="space-y-6">
      <div>
        <SectionTag>{'// SCAN'}</SectionTag>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Scan results</h1>
      </div>
      <ScanRunner scanId={id} />
    </div>
  )
}
