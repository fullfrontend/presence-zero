import { explainScore, type ScoreExplanation } from '@/core/scoring'
import { generatePitch, type Pitch } from '@/core/pitch'
import type { PresenceStatus } from '@/core/types'

export interface DomainInfo {
  domain: string
  available: boolean | null
}

/** The subset of a results-table row the explainer/pitch need. */
export interface ExplainableRow {
  listedWebsite?: string | null
  facebookUrl?: string | null
  sourceUrl?: string | null
  name: string
  category?: string | null
  phone: string | null
  rating: number | null
  reviewCount: number | null
  presenceStatus: string | null
  score: number | null
  domains: DomainInfo[]
}

function toPresence(status: string | null): PresenceStatus {
  return (status ?? 'probe_failed') as PresenceStatus
}

/** The best domain worth pitching: an available `.com` first, else any available candidate. */
export function bestAvailableDomain(domains: DomainInfo[]): string | null {
  const available = domains.filter(d => d.available === true)
  return available.find(d => d.domain.endsWith('.com'))?.domain ?? available[0]?.domain ?? null
}

/**
 * Explains a row's stored score, reconciled so the breakdown always sums to the
 * number the user sees (see `explainScore` in core for why the domain factor absorbs
 * the residual).
 */
export function explainResultRow(row: ExplainableRow): ScoreExplanation {
  return explainScore(
    {
      presence: toPresence(row.presenceStatus),
      reviewCount: row.reviewCount,
      rating: row.rating,
      exactComAvailable: row.domains.some(d => d.domain.endsWith('.com') && d.available === true),
      hasPhone: !!row.phone,
    },
    { total: row.score ?? undefined },
  )
}

export function pitchForRow(row: ExplainableRow, location?: string | null): Pitch {
  return generatePitch({
    name: row.name,
    category: row.category ?? null,
    location: location ?? null,
    presence: toPresence(row.presenceStatus),
    rating: row.rating,
    reviewCount: row.reviewCount,
    availableDomain: bestAvailableDomain(row.domains),
  })
}

/** Flattens a pitch into plain text for the clipboard. */
export function buildPitchText(pitch: Pitch): string {
  const lines = [pitch.headline, '', pitch.angle]
  if (pitch.talkingPoints.length) lines.push('', ...pitch.talkingPoints.map(t => `• ${t}`))
  if (pitch.suggestedDomain) lines.push('', `Suggested domain: ${pitch.suggestedDomain}`)
  return lines.join('\n')
}
