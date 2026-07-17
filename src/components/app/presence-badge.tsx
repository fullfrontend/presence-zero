import { presenceMeta, probeFallbackDetail } from '@/lib/presence'
import { ProbeTooltip } from './probe-tooltip'
const DOT: Record<string, string> = {
  solid: 'bg-lime', ring: 'border border-lime bg-transparent',
  half: 'bg-lime/40', muted: 'bg-white/30', unknown: 'bg-white/20',
}
export function PresenceBadge({
  status, website, detail,
}: { status: string | null; website?: string | null; detail?: string | null }) {
  const m = presenceMeta(status)
  const badge = (
    <span className="inline-flex items-center gap-1.5 rounded border border-line bg-surface px-2 py-0.5">
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[m.dot]}`} aria-hidden="true" />
      <span className={`font-mono text-[10px] uppercase tracking-[0.12em] ${m.isLead ? 'text-text' : 'text-mute'}`}>{m.label}</span>
    </span>
  )
  // No hover affordance unless a caller opts in — keeps existing usages identical.
  if (website === undefined && detail === undefined) return badge
  return (
    <ProbeTooltip website={website ?? null} detail={detail ?? probeFallbackDetail(status)}>
      {badge}
    </ProbeTooltip>
  )
}
