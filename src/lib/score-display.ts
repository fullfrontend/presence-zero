export type ScoreBand = 'high' | 'good' | 'mid' | 'low' | 'none'

export function scoreBand(score: number | null): ScoreBand {
  if (score == null) return 'none'
  if (score >= 80) return 'high'
  if (score >= 60) return 'good'
  if (score >= 40) return 'mid'
  return 'low'
}

// Lime for high/good, off-white for mid, dimmed for low/none.
export function scoreNumberClass(score: number | null): string {
  switch (scoreBand(score)) {
    case 'high': return 'text-lime font-semibold'
    case 'good': return 'text-lime/90 font-semibold'
    case 'mid':  return 'text-text font-semibold'
    default:     return 'text-mute font-medium'
  }
}

export function scoreBarWidth(score: number | null): string {
  const n = Math.max(0, Math.min(100, score ?? 0))
  return `${n}%`
}
