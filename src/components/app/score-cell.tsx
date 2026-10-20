import { scoreNumberClass, scoreBarWidth } from '@/lib/score-display'
export function ScoreCell({ score }: { score: number | null }) {
  return (
    <div className="w-16">
      <div className={`text-lg tabular-nums ${scoreNumberClass(score)}`}>{score ?? '—'}{score !== null && <span className="text-[10px] font-normal text-mute">/100</span>}</div>
      <div className="mt-1 h-0.5 w-full bg-line"><div className="h-full bg-lime" style={{ width: scoreBarWidth(score) }} /></div>
    </div>
  )
}
