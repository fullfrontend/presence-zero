import { getI18n } from '@/i18n/server'
import Link from 'next/link'
import ScanRunner from '@/components/app/scan-runner'
import { SectionTag } from '@/components/brand/section-tag'

export default async function ScanPage({ params }: { params: Promise<{ id: string }> }) {
  const { t } = await getI18n()
  const { id } = await params
  return (
    <div className="space-y-6">
      <div>
        <Link href="/app" className="inline-flex items-center gap-1 text-sm text-dim transition hover:text-text">
          {t("← Back to scans")}
        </Link>
        <div className="mt-4">
          <SectionTag>{t("// SCAN")}</SectionTag>
        </div>
      </div>
      <ScanRunner scanId={id} />
    </div>
  )
}
