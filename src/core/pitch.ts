import { englishText, type TranslateText } from './text'
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
export function generatePitch(i: PitchInput, t: TranslateText = englishText): Pitch {
  if (i.presence === 'configuration_error') {
    return {
      headline: t('A website configuration problem to resolve.'),
      angle: t('A configuration problem was detected for {0}. Review the diagnosis and propose a targeted repair before considering a redesign.', { 0: i.name }),
      talkingPoints: [t('A configuration error does not prove the website is absent or needs rebuilding.')],
    }
  }
  if (i.presence === 'facebook') {
    return {
      headline: t("A Facebook presence to complement with an independent website."),
      angle: t("{0} lists a Facebook page. Check whether a separate website already exists before proposing a site that complements their social presence.", { 0: i.name }),
      talkingPoints: [t("An independent site can bring together services, contact details and booking information alongside Facebook.")],
      ...(i.availableDomain ? { suggestedDomain: i.availableDomain } : {}),
    }
  }
  if (i.presence === 'not_found') {
    return {
      headline: t("No website found after search."),
      angle: t("The search found no website for {0}. Confirm this with the business before offering to build one.", { 0: i.name }),
      talkingPoints: [t("A search with no results is not proof that the business has no website.")],
      ...(i.availableDomain ? { suggestedDomain: i.availableDomain } : {}),
    }
  }

  const isLead = i.presence === 'none' || i.presence === 'dead' || i.presence === 'parked'
  const who = i.category ? t("This {0}", { 0: t(i.category) }) : t("This business")

  if (!isLead) {
    return {
      headline: t("{0} already has a working site.", { 0: i.name }),
      angle: t("{0} is already online — not a website lead. Look for an SEO, redesign, or booking-flow angle instead.", { 0: i.name }),
      talkingPoints: [],
    }
  }

  if (i.presence === 'none') {
    return {
      headline: t("Website presence needs verification."),
      angle: t("{0} has no website listed by the source. Verify whether an official site exists before offering to build one.", { 0: i.name }),
      talkingPoints: [
        ...(i.reviewCount != null && i.rating != null ? [t("{0} reviews at {1}★ — check their existing web presence.", { 0: i.reviewCount, 1: i.rating })] : []),
        ...(i.availableDomain ? [t("{0} is available, but domain availability does not prove the business has no website.", { 0: i.availableDomain })] : []),
      ],
      ...(i.availableDomain ? { suggestedDomain: i.availableDomain } : {}),
    }
  }

  const presence = i.presence as 'none' | 'dead' | 'parked'
  const points: string[] = []

  const hasRating = i.rating != null && Number.isFinite(i.rating)
  const hasReviews = i.reviewCount != null && Number.isFinite(i.reviewCount) && i.reviewCount > 0

  if (hasReviews && hasRating && (i.rating as number) >= GOOD_RATING) {
    points.push(t("{0} reviews at {1}★ — real demand, but nowhere online to send those customers.", { 0: i.reviewCount, 1: i.rating }))
  } else if (hasReviews) {
    points.push(t("{0} reviews already — customers are searching for them and finding no site.", { 0: i.reviewCount }))
  } else if (hasRating && (i.rating as number) >= GOOD_RATING) {
    points.push(t("Strong {0}★ reputation with no website to back it up.", { 0: i.rating }))
  }

  points.push(t("With {0}, every \"do they have a website?\" search is a booking that goes to a competitor.", { 0: t(PRESENCE_FACT[presence]) }))

  const suggestedDomain = i.availableDomain ?? undefined
  if (suggestedDomain) {
    points.push(t("The matching domain {0} is still available to register — a concrete, low-friction first offer.", { 0: suggestedDomain }))
  }

  const locationBit = i.location ? t(" in {0}", { 0: i.location }) : ''
  const angle =
    t("{0}{1} {2}. ", { 0: who, 1: locationBit, 2: t(PRESENCE_HOOK[presence]) }) +
    t("Reach out as a person who noticed{0}: ", { 0: hasReviews ? t(" their {0} reviews", { 0: i.reviewCount }) : '' }) +
    t("offer to get them a simple site{0} so customers can find and book them.", { 0: suggestedDomain ? t(" on {0}", { 0: suggestedDomain }) : '' })

  return {
    headline: t(PRESENCE_HEADLINE[presence]),
    angle,
    talkingPoints: points,
    ...(suggestedDomain ? { suggestedDomain } : {}),
  }
}
