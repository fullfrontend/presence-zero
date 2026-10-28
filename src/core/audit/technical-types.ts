export interface SeoCheck {
  id: string
  label: string
  status: 'pass' | 'warning' | 'unknown'
  detail: string
}
export interface SeoPage {
  title: string
  description: string
  checks: SeoCheck[]
  responseMs: number
}
export interface SeoReport {
  pagesChecked: number
  pagesIncomplete: number
  checks: (SeoCheck & { evidenceId: string })[]
}
export interface LighthouseRun {
  status: 'complete' | 'unavailable'
  strategy: 'mobile' | 'desktop'
  checkedAt: string
  durationMs: number
  requestedUrl: string
  finalUrl?: string
  version?: string
  reason?: string
  scores?: { performance: number | null; accessibility: number | null; seo: number | null; bestPractices: number | null }
  metrics?: { lcpMs: number | null; cls: number | null; tbtMs: number | null; fcpMs: number | null; speedIndexMs: number | null }
  opportunities?: { id: string; title: string; detail: string }[]
}
