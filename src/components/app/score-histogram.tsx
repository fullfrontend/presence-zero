// Buckets of 20; lime bars for lead buckets, violet for the 0-19 (alive/none-lead) bucket.
export function ScoreHistogram({ scores }: { scores: (number | null)[] }) {
  const vals = scores.map(s => s ?? 0)
  if (vals.length < 2) return null
  const buckets = [0, 0, 0, 0, 0]
  for (const v of vals) buckets[Math.min(4, Math.floor(v / 20))]++
  const max = Math.max(...buckets, 1)
  const labels = ['0', '20', '40', '60', '80']
  return (
    <div className="flex items-end gap-1" aria-hidden="true">
      {buckets.map((b, i) => (
        <div key={i} className="flex w-6 flex-col items-center gap-1">
          <div className="flex h-10 w-full items-end"><div className={`w-full ${i === 0 ? 'bg-violet/70' : 'bg-lime'}`} style={{ height: `${(b / max) * 100}%` }} /></div>
          <span className="font-mono text-[9px] text-mute">{labels[i]}</span>
        </div>
      ))}
    </div>
  )
}
