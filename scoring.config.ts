// Tune lead-score weights here.
// Total possible = 100. none means unverified (legacy status name).
// No site found > Facebook > unverified > live site, with other factors equal.
export const SCORING_WEIGHTS = {
  presence: { not_found: 40, none: 15, dead: 35, parked: 30, facebook: 25 },
  reviewsMax: 25, reviewsCap: 50,
  goodRating: 10, goodRatingThreshold: 4.0,
  exactDomainAvailable: 15, hasPhone: 10,
}
