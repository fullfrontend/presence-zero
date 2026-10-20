'use client'
import { useI18n } from '@/i18n/client'
import type { AuditReport } from '@/core/audit/types'

export function AuditDetail({ report }: { report: AuditReport }) {
  const { t, system, date } = useI18n()
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'presencezero-audit.json'
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return (
    <section aria-label={t("Local AI audit")} className="border-t border-line pt-4 md:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-mono text-[11px] uppercase tracking-wide text-dim">{t("Local AI audit · ")}{report.status}</h3>
        <button type="button" onClick={download} className="text-xs text-lime underline">{t("Download report & evidence")}</button>
      </div>
      <p className="mt-2 text-xs text-mute">{report.model} · {report.language} · {date(report.createdAt, { dateStyle: 'medium', timeStyle: 'short' })} UTC</p>
      {report.promptProfile && <p className="mt-1 text-xs text-mute">{t("Prompt profile: ")}{report.promptProfile.id} {t(" · revision ")}{report.promptProfile.revision.slice(0, 12)}</p>}
      {report.preparation && <p className="mt-1 text-xs text-mute">{t("Evidence preparation: ")}{report.preparation.model} · {report.preparation.status === "complete" ? t("verified excerpts selected") : t("original evidence used after preparation failure")}</p>}
      <p className="mt-2 text-xs text-dim">{system(report.verification.detail)}</p>
      {report.reason && <p className="mt-2 text-sm text-amber-400">{system(report.reason)}</p>}
      {report.status === "complete" && <>
        <p className="mt-3 text-sm text-text">{report.summary}</p>
        <ul className="mt-4 space-y-4">
          {report.findings.map((finding, index) => <li key={index} className="border-l border-line pl-3">
            <p className="text-sm text-text">{finding.observation}</p>
            <p className="mt-1 text-sm text-dim">{finding.recommendation}</p>
            <blockquote className="mt-2 text-xs text-mute">“{finding.quote}” — {finding.evidenceId}</blockquote>
          </li>)}
        </ul>
        <h4 className="mt-4 text-xs font-medium text-text">{t("Suggested project brief")}</h4>
        <p className="mt-1 whitespace-pre-wrap text-sm text-dim">{report.brief}</p>
        <p className="mt-2 text-xs text-mute">{t("AI findings support your research. They do not add a second lead score or bonus points.")}</p>
        <p className="mt-3 text-xs text-mute">{t("AI estimate from sampled text and HTML. No visual, performance or accessibility test. Review the evidence; the original lead score is unchanged.")}</p>
      </>}
      {report.evidence.length > 0 && <details className="mt-4 text-xs">
        <summary className="cursor-pointer text-dim">{t("Collected evidence (")}{report.evidence.length})</summary>
        <ul className="mt-3 space-y-4">
          {report.evidence.map(page => <li key={page.id} className="min-w-0">
            <p className="text-text">{page.id} · {page.error ?? "collected"}{page.truncated ? t(" · partial content") : ''}</p>
            {/^https?:\/\//i.test(page.url) && <a href={page.url} target="_blank" rel="noopener noreferrer" className="break-all text-lime underline">{page.url}</a>}
            <p className="mt-1 text-mute">{date(page.retrievedAt, { dateStyle: 'medium', timeStyle: 'short' })} UTC {t(" · HTTP ")}{page.statusCode ?? '—'} · {page.contentType}</p>
            <p className="break-all text-mute">{t("SHA-256: ")}{page.sha256 ?? '—'}</p>
            {page.facts.map(fact => <p key={fact} className="mt-1 text-dim">{fact}</p>)}
            <p className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-mute">{page.text}</p>
          </li>)}
        </ul>
      </details>}
    </section>
  )
}
