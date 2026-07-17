'use client'
import { useState } from 'react'
import { explainResultRow, pitchForRow, buildPitchText, type ExplainableRow } from '@/lib/score-explain'
import { presenceMeta } from '@/lib/presence'

function FactorBar({ label, points, max, hit }: { label: string; points: number; max: number; hit: boolean }) {
  const pct = max > 0 ? Math.round((points / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className={`w-40 shrink-0 text-xs ${hit ? 'text-text' : 'text-mute'}`}>{label}</span>
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
        <span className={`block h-full rounded-full ${hit ? 'bg-lime' : 'bg-mute/40'}`} style={{ width: `${pct}%` }} />
      </span>
      <span className={`w-12 shrink-0 text-right font-mono text-xs tabular-nums ${hit ? 'text-lime' : 'text-mute'}`}>
        {hit ? `+${points}` : '0'}<span className="text-mute">/{max}</span>
      </span>
    </div>
  )
}

export function LeadDetail({ row, location }: { row: ExplainableRow; location?: string | null }) {
  const [copied, setCopied] = useState(false)
  const explanation = explainResultRow(row)
  const isLead = presenceMeta(row.presenceStatus).isLead
  const pitch = pitchForRow(row, location)

  async function copyPitch() {
    const text = buildPitchText(pitch)
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard blocked (permissions/context) — leave the button idle rather than erroring.
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 rounded-lg border border-line bg-base/40 p-4 md:grid-cols-2">
      <section aria-label="Score breakdown">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-mute">Why this scores {explanation.total}</h3>
        <div className="mt-3 space-y-2">
          {explanation.factors.map(f => <FactorBar key={f.key} label={f.label} points={f.points} max={f.max} hit={f.hit} />)}
        </div>
      </section>

      {isLead ? (
        <section aria-label="Outreach pitch" className="md:border-l md:border-line md:pl-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-mute">Outreach angle</h3>
            <button
              type="button"
              onClick={copyPitch}
              className="rounded border border-line px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-dim transition hover:border-lime/50 hover:text-text"
            >
              {copied ? '✓ Copied' : 'Copy pitch'}
            </button>
          </div>
          <p className="mt-3 text-sm font-medium text-text">{pitch.headline}</p>
          <p className="mt-1.5 text-sm text-dim">{pitch.angle}</p>
          {pitch.talkingPoints.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {pitch.talkingPoints.map((t, i) => (
                <li key={i} className="flex gap-2 text-xs text-dim">
                  <span aria-hidden="true" className="text-lime">–</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[10px] text-mute">A human starting point — personalize it before you send. PresenceZero is a finder, not a bulk-mailer.</p>
        </section>
      ) : (
        <section className="md:border-l md:border-line md:pl-6">
          <p className="text-xs text-mute">This isn’t a lead ({presenceMeta(row.presenceStatus).label.toLowerCase()}), so there’s no outreach angle to draft.</p>
        </section>
      )}
    </div>
  )
}
