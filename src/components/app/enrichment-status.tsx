'use client'
import { useI18n } from '@/i18n/client'
export interface EnrichmentTask { kind: string; status: string; error: string | null; availableAt: number }
const LABELS: Record<string, string> = { search: 'Website search', probe: 'Website check', domains: 'Domain checks', phone: 'Phone lookup', audit: 'AI qualification' }
export function EnrichmentStatus({ tasks, compact = false }: { tasks?: EnrichmentTask[]; compact?: boolean }) {
  const { t, date } = useI18n()
  if (!tasks?.length) return null
  if (compact) return tasks.some(task => task.status === 'pending' || task.status === 'running')
    ? <span className="mt-1 block text-[10px] text-lime">{t('Enriching…')}</span> : null
  return <section className="mb-4 rounded-lg border border-line p-4" aria-label={t('Background tasks')}>
    <h3 className="text-xs font-medium text-dim">{t('Background tasks')}</h3>
    <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {tasks.map(task => <li key={task.kind} className="text-xs">
        <span className="text-dim">{t(LABELS[task.kind] ?? task.kind)}</span>{' · '}
        <span className={task.status === 'failed' ? 'text-amber-400' : task.status === 'running' ? 'text-lime' : 'text-mute'}>{t(task.status === 'pending' ? 'Waiting' : task.status === 'running' ? 'Running' : task.status === 'failed' ? 'Failed' : 'Finished')}</span>
        {task.error && <p className="mt-1 text-mute">{t(task.status === 'failed' ? 'This task could not finish. Other results are preserved.' : 'A retry is scheduled; other tasks continue.')}
          {task.status === 'pending' && task.availableAt > 0 && <> {' '}{date(task.availableAt, { timeStyle: 'short' })}</>}</p>}
      </li>)}
    </ul>
  </section>
}
