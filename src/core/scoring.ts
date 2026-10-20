import type { AuditReport } from './audit/types'
import { websiteOpportunity } from './website-opportunity'
import { SCORING_WEIGHTS as W } from '../../scoring.config'
import type { PresenceStatus } from './types'

export interface ScoreInput {
  auditReport?: AuditReport | null
  presence: PresenceStatus | null
  reviewCount?: number | null
  rating?: number | null
  exactComAvailable: boolean
  hasPhone: boolean
  leadStatus?: string
}
export type ScoreFactorKey = 'presence' | 'reviews' | 'rating' | 'exactDomain' | 'phone'
export interface ScoreFactor { key: ScoreFactorKey; label: string; points: number; max: number; hit: boolean }
export interface ScoreExplanation {
  total: number | null
  factors: ScoreFactor[]
  confidence: 'low' | 'medium' | 'high'
  reason: string
  need: number | null
}
const LABELS: Record<PresenceStatus, string> = {
  not_found: 'No website found after search', none: 'Website unverified', facebook: 'Facebook page, no independent site verified',
  dead: 'Dead website', parked: 'Parked domain', alive: 'Website improvement potential', probe_failed: 'Probe failed',
}
const clamp = (value: number, max = 1) => Math.max(0, Math.min(max, value))
const finite = (value: number | null | undefined) => typeof value === 'number' && Number.isFinite(value)

/** Every factor is modulated by need. Rounded factors sum exactly to the total. */
export function explainScore(i: ScoreInput): ScoreExplanation {
  if (['lost', 'won', 'skipped'].includes(i.leadStatus ?? '')) return {
    total: 0, factors: [], confidence: 'high', need: 0, reason: 'Excluded from new prospecting by its lead status.',
  }
  const opportunity = websiteOpportunity(i.auditReport)
  if (!i.presence || i.presence === 'probe_failed' || (i.presence === 'alive' && opportunity === null)) return {
    total: null, factors: [], confidence: 'low', need: null,
    reason: 'Insufficient evidence to assess the website need. This is not a rejected lead.',
  }
  const need = i.presence === 'alive' ? opportunity! / 100 : W.need[i.presence]
  const reviews = finite(i.reviewCount) ? Math.max(0, i.reviewCount!) : 0
  const activity = W.activityTiers.find(([minimum]) => reviews >= minimum)?.[1] ?? 0
  const reputation = finite(i.rating) ? clamp((i.rating! - W.reputationMin) / (W.reputationFull - W.reputationMin)) * clamp(reviews / W.reputationMinReviews) : 0
  const values: [ScoreFactorKey, string, number, number][] = [
    ['presence', LABELS[i.presence], W.needMax, W.needMax],
    ['reviews', 'Observed business activity (reviews)', W.activityMax * activity, W.activityMax],
    ['phone', 'Direct contact available (phone)', i.hasPhone ? W.contactMax : 0, W.contactMax],
    ['rating', 'Reputation supported by reviews', W.reputationMax * reputation, W.reputationMax],
    ['exactDomain', 'Domain ready for the website project', i.presence === 'alive' || i.exactComAvailable ? W.domainMax : 0, W.domainMax],
  ]
  // Cumulative rounding keeps monotonic totals and an exact, honest breakdown.
  let sum = 0, rounded = 0
  const factors = values.map(([key, label, raw, max]) => {
    sum += raw * need
    const next = Math.round(sum)
    const points = next - rounded
    rounded = next
    return { key, label, points, max, hit: points > 0 }
  })
  const confidence = i.presence === 'none' ? 'low' : finite(i.reviewCount) && finite(i.rating) && i.hasPhone ? 'high' : 'medium'
  return { total: clamp(rounded, 100), factors, confidence, need,
    reason: 'Prospecting priority based on observed need, activity, contactability and reputation; not a sales probability.' }
}
export function computeScore(i: ScoreInput): number | null { return explainScore(i).total }
