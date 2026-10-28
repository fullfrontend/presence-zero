'use client'
import type { AuditReport } from '@/core/audit/types'
import { useI18n } from '@/i18n/client'

export function TechnicalAudit({ report }: { report: AuditReport }) {
  const { t, number } = useI18n()
  if (!report.seo && !report.lighthouse) return null
  const measured = (value: number | null | undefined, unit = '') => value == null ? '—' : `${number(Math.round(value * 1000) / 1000)}${unit}`
  return <div className="mt-4 space-y-4">
    <h4 className="text-sm font-medium">{t('Automatic SEO and performance checks')}</h4>
    <p className="text-xs text-mute">{t('Scores below measure technical quality: higher is better. They are not lead scores or search rankings. Lab measurements vary; validate important findings before proposing work.')}</p>
    {report.lighthouse?.map(run => <section key={run.strategy} className="rounded border border-line p-3">
      <h5 className="text-sm">Lighthouse · {run.strategy} · {t(run.status === 'complete' ? 'Measured' : 'Unavailable')}</h5>
      {run.status === 'unavailable' ? <p className="mt-2 text-xs text-amber-400">{t('Measurement unavailable; no conclusion about the website.')} {run.reason === 'pagespeed_http_429' ? t('PageSpeed quota exhausted. Configure your API key or retry later.') : run.reason}</p> : <>
        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[[t('Performance'), run.scores?.performance], [t('Accessibility'), run.scores?.accessibility], [t('SEO'), run.scores?.seo], [t('Best practices'), run.scores?.bestPractices]].map(([label, score]) => <div key={String(label)}><dt className="text-xs text-mute">{label}</dt><dd className="text-lg">{score ?? '—'}<span className="text-xs text-mute">/100</span></dd></div>)}
        </dl>
        <p className="mt-3 text-xs">LCP {measured(run.metrics?.lcpMs, ' ms')} · CLS {measured(run.metrics?.cls)} · TBT {measured(run.metrics?.tbtMs, ' ms')} · FCP {measured(run.metrics?.fcpMs, ' ms')}</p>
        <p className="mt-2 text-xs text-mute">{t('Simulated lab run, not real-user Core Web Vitals. TBT is not INP. Automated accessibility checks do not certify compliance.')}</p>
        {!!run.opportunities?.length && <ul className="mt-3 space-y-1 text-xs">{run.opportunities.map(item => <li key={item.id}>{item.title}{item.detail ? ` — ${item.detail}` : ''}</li>)}</ul>}
      </>}
      <p className="mt-2 text-xs text-mute">{run.checkedAt} · {measured(run.durationMs / 1000, ' s')}{run.version ? ` · Lighthouse ${run.version}` : ''}</p>
    </section>)}
    {!report.lighthouse && <p className="text-xs text-mute">{t('Lighthouse was not enabled for this audit.')}</p>}
    {report.seo && <details className="rounded border border-line p-3" open>
      <summary className="cursor-pointer text-sm">{t('SEO checks on sampled HTML')} · {report.seo.pagesChecked} {t('pages')} · {report.seo.checks.filter(check => check.status === 'warning').length} {t('points to review')}</summary>
      <p className="mt-2 text-xs text-mute">{t('No search ranking, traffic or indexing data was measured. Unknown or incomplete evidence is not a defect.')}</p>
      <ul className="mt-3 max-h-80 space-y-3 overflow-auto text-xs">{report.seo.checks.map((check, index) => <li key={`${check.evidenceId}-${check.id}-${index}`}>
        <p className={check.status === 'warning' ? 'text-amber-400' : 'text-dim'}>{t(check.label)} · {t(check.status === 'pass' ? 'Observed' : check.status === 'warning' ? 'Review' : 'Unknown')} · {check.evidenceId}</p>
        <p className="mt-1 text-mute">{check.detail}</p>
      </li>)}</ul>
    </details>}
    {report.timings && <p className="text-xs text-mute">{t('Audit duration')} : {measured(report.timings.totalMs / 1000, ' s')} · {t('AI inference')} : {measured(report.timings.inferenceMs / 1000, ' s')}</p>}
  </div>
}
