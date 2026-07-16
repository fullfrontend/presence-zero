import ScanRunner from '@/components/scan-runner'

export default async function ScanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Scan results</h1>
      <ScanRunner scanId={id} />
    </div>
  )
}
