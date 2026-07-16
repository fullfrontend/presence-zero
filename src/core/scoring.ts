import { SCORING_WEIGHTS as W } from '../../scoring.config'
import type { PresenceStatus } from './types'

export interface ScoreInput {
  presence: PresenceStatus
  reviewCount?: number | null
  rating?: number | null
  exactComAvailable: boolean
  hasPhone: boolean
}

export function computeScore(i: ScoreInput): number {
  if (i.presence === 'alive' || i.presence === 'probe_failed') return 0
  let score = W.presence[i.presence]
  score += Math.round(Math.min(i.reviewCount ?? 0, W.reviewsCap) / W.reviewsCap * W.reviewsMax)
  if ((i.rating ?? 0) >= W.goodRatingThreshold) score += W.goodRating
  if (i.exactComAvailable) score += W.exactDomainAvailable
  if (i.hasPhone) score += W.hasPhone
  return score
}
