import { SCORING_WEIGHTS as W } from '../../scoring.config'
export type ScoreBand = 'high' | 'good' | 'mid' | 'low' | 'none'

export function scoreBand(score: number | null): ScoreBand {
  if (score == null) return 'none'
  if (score >= W.bands.priority) return 'high'
  if (score >= W.bands.promising) return 'good'
  if (score >= W.bands.research) return 'mid'
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

export function scoreLevel(score: number | null): string {
  if (score === null) return 'Not assessed'
  if (score >= W.bands.priority) return 'Priority prospect'
  if (score >= W.bands.promising) return 'Promising prospect'
  if (score >= W.bands.research) return 'Research first'
  if (score >= W.bands.low) return 'Low priority'
  return 'Not a priority'
}
