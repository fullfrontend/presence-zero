// Prospecting priority, not a probability of winning a sale.
// Need modulates every factor, so popularity alone cannot make a good website a hot lead.
export const SCORING_WEIGHTS = {
  needMax: 45,
  need: { not_found: 1, dead: 0.95, parked: 0.9, facebook: 0.75, none: 0.4 },
  activityMax: 20,
  activityTiers: [[100, 1], [50, 0.85], [20, 0.65], [5, 0.4], [1, 0.2]] as const,
  contactMax: 20,
  reputationMax: 10, reputationMin: 3, reputationFull: 4.5, reputationMinReviews: 10,
  domainMax: 5,
  bands: { priority: 80, promising: 60, research: 40, low: 20 },
}
