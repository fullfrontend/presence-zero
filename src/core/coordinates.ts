/** Keep coordinate pairs together; never place missing/invalid data at (0, 0). */
export function coordinates(latitude: unknown, longitude: unknown): { latitude?: number; longitude?: number } {
  return typeof latitude === 'number' && Number.isFinite(latitude) && Math.abs(latitude) <= 90 &&
    typeof longitude === 'number' && Number.isFinite(longitude) && Math.abs(longitude) <= 180
    ? { latitude, longitude } : {}
}
