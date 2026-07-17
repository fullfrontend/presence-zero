import type { PresenceStatus } from './types'

export interface PitchInput {
  name: string
  category?: string | null
  location?: string | null
  presence: PresenceStatus
  rating?: number | null
  reviewCount?: number | null
  availableDomain?: string | null
}

export interface Pitch {
  /** One-line hook. */
  headline: string
  /** 1–2 sentence human outreach angle. */
  angle: string
  /** Concrete bullets built from real signals. */
  talkingPoints: string[]
  /** Echoes the available domain worth pitching, when present. */
  suggestedDomain?: string
}

const PRESENCE_HOOK: Record<'none' | 'dead' | 'parked', string> = {
  none: 'has no website at all',
  dead: 'has a website that no longer loads (it looks down)',
  parked: 'has a domain that is parked / listed for sale rather than a real site',
}

const PRESENCE_HEADLINE: Record<'none' | 'dead' | 'parked', string> = {
  none: 'A real local business with no website.',
  dead: 'A real local business whose site is down.',
  parked: 'A real local business whose domain is parked.',
}

// Subject-free clause, safe after "With ___," (avoids "They has …" agreement bugs).
const PRESENCE_FACT: Record<'none' | 'dead' | 'parked', string> = {
  none: 'no website at all',
  dead: 'a website that no longer loads',
  parked: 'a parked domain instead of a real site',
}

const GOOD_RATING = 4.0

/**
 * Deterministic, network-free draft of a *human* outreach angle for one lead —
 * built only from real signals. It is a starting point for a personal message,
 * never a mass-mail template (PresenceZero is a finder, not a spam tool).
 */
export function generatePitch(i: PitchInput): Pitch {
  const isLead = i.presence === 'none' || i.presence === 'dead' || i.presence === 'parked'
  const who = i.category ? `This ${i.category}` : 'This business'

  if (!isLead) {
    return {
      headline: `${i.name} already has a working site.`,
      angle: `${i.name} is already online — not a website lead. Look for an SEO, redesign, or booking-flow angle instead.`,
      talkingPoints: [],
    }
  }

  const presence = i.presence as 'none' | 'dead' | 'parked'
  const points: string[] = []

  const hasRating = i.rating != null && Number.isFinite(i.rating)
  const hasReviews = i.reviewCount != null && Number.isFinite(i.reviewCount) && i.reviewCount > 0

  if (hasReviews && hasRating && (i.rating as number) >= GOOD_RATING) {
    points.push(`${i.reviewCount} reviews at ${i.rating}★ — real demand, but nowhere online to send those customers.`)
  } else if (hasReviews) {
    points.push(`${i.reviewCount} reviews already — customers are searching for them and finding no site.`)
  } else if (hasRating && (i.rating as number) >= GOOD_RATING) {
    points.push(`Strong ${i.rating}★ reputation with no website to back it up.`)
  }

  points.push(`With ${PRESENCE_FACT[presence]}, every "do they have a website?" search is a booking that goes to a competitor.`)

  const suggestedDomain = i.availableDomain ?? undefined
  if (suggestedDomain) {
    points.push(`The matching domain ${suggestedDomain} is still available to register — a concrete, low-friction first offer.`)
  }

  const locationBit = i.location ? ` in ${i.location}` : ''
  const angle =
    `${who}${locationBit} ${PRESENCE_HOOK[presence]}. ` +
    `Reach out as a person who noticed${hasReviews ? ` their ${i.reviewCount} reviews` : ''}: ` +
    `offer to get them a simple site${suggestedDomain ? ` on ${suggestedDomain}` : ''} so customers can find and book them.`

  return {
    headline: PRESENCE_HEADLINE[presence],
    angle,
    talkingPoints: points,
    ...(suggestedDomain ? { suggestedDomain } : {}),
  }
}
