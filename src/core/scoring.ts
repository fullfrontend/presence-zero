import { SCORING_WEIGHTS as W } from '../../scoring.config'
import type { PresenceStatus } from './types'

export interface ScoreInput {
  presence: PresenceStatus
  reviewCount?: number | null
  rating?: number | null
  exactComAvailable: boolean
  hasPhone: boolean
}

export type ScoreFactorKey = 'presence' | 'reviews' | 'rating' | 'exactDomain' | 'phone'

export interface ScoreFactor {
  key: ScoreFactorKey
  label: string
  points: number
  max: number
  hit: boolean
}

export interface ScoreExplanation {
  total: number
  factors: ScoreFactor[]
}

const PRESENCE_LABEL: Record<PresenceStatus, string> = {
  none: 'No website',
  dead: 'Dead website',
  parked: 'Parked domain',
  alive: 'Site is live',
  probe_failed: 'Probe failed',
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

/**
 * Breaks a score into its weighted factors. `sum(factors.points) === total`.
 *
 * When `opts.total` is supplied (the authoritative DB-stored score), the `exactDomain`
 * factor absorbs any residual so the breakdown always reconciles to the score the user
 * sees — the client cannot perfectly reconstruct the exact-match `.com` bonus from the
 * returned domains list, but the other four factors are unambiguous from row signals.
 */
export function explainScore(i: ScoreInput, opts?: { total?: number }): ScoreExplanation {
  const isLead = i.presence !== 'alive' && i.presence !== 'probe_failed'

  const presencePts = isLead ? W.presence[i.presence as 'none' | 'dead' | 'parked'] : 0
  const reviewPts = isLead
    ? Math.round(Math.min(i.reviewCount ?? 0, W.reviewsCap) / W.reviewsCap * W.reviewsMax)
    : 0
  const ratingHit = isLead && (i.rating ?? 0) >= W.goodRatingThreshold
  const ratingPts = ratingHit ? W.goodRating : 0
  let domainPts = isLead && i.exactComAvailable ? W.exactDomainAvailable : 0
  const phonePts = isLead && i.hasPhone ? W.hasPhone : 0

  if (opts?.total != null && isLead) {
    const others = presencePts + reviewPts + ratingPts + phonePts
    domainPts = clamp(opts.total - others, 0, W.exactDomainAvailable)
  }

  const factors: ScoreFactor[] = [
    { key: 'presence', label: PRESENCE_LABEL[i.presence], points: presencePts, max: W.presence.none, hit: presencePts > 0 },
    { key: 'reviews', label: i.reviewCount ? `${i.reviewCount} reviews` : 'Few/no reviews', points: reviewPts, max: W.reviewsMax, hit: reviewPts > 0 },
    { key: 'rating', label: i.rating != null ? `Rating ${i.rating}` : 'No rating', points: ratingPts, max: W.goodRating, hit: ratingPts > 0 },
    { key: 'exactDomain', label: 'Exact-match .com free', points: domainPts, max: W.exactDomainAvailable, hit: domainPts > 0 },
    { key: 'phone', label: 'Has phone', points: phonePts, max: W.hasPhone, hit: phonePts > 0 },
  ]

  const total = opts?.total != null && isLead ? opts.total : factors.reduce((s, f) => s + f.points, 0)
  return { total, factors }
}

export function computeScore(i: ScoreInput): number {
  return explainScore(i).total
}
