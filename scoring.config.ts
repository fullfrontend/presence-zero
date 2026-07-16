// Tune lead-score weights here.
// Total possible = 100.
export const SCORING_WEIGHTS = {
  presence: { none: 40, dead: 35, parked: 30 },
  reviewsMax: 25, reviewsCap: 50,
  goodRating: 10, goodRatingThreshold: 4.0,
  exactDomainAvailable: 15, hasPhone: 10,
}
