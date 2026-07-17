import { z } from 'zod'

const DEFAULT_APIFY_MAX_PLACES_CEILING = 100

/**
 * Parses APIFY_MAX_PLACES into the effective route-boundary ceiling. A
 * self-hoster on a paid Apify plan may raise this above the default 100 (see
 * README.md / .env.example); anything unset, non-numeric, NaN, <= 0, or
 * non-finite falls back to the default rather than disabling the ceiling.
 */
export function parseApifyMaxPlacesCeiling(raw: string | undefined): number {
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_APIFY_MAX_PLACES_CEILING
}

// Read once at module scope (matching src/server/pipeline-deps.ts), not per request.
const APIFY_MAX_PLACES_CEILING = parseApifyMaxPlacesCeiling(process.env.APIFY_MAX_PLACES)

export const createScanSchema = z.object({
  location: z.string().min(1, 'location is required'),
  category: z.string().min(1, 'category is required'),
  countryCode: z.string().length(2).default('us'),
  provider: z.enum(['google', 'osm', 'csv', 'apify']),
  csvContent: z.string().optional(),
  // Route-boundary cost ceiling: Apify bills $0.004/place. This must REJECT above the
  // ceiling, not clamp — the caller needs to learn their request was refused. The
  // provider also clamps defensively in core, but that's a belt-and-suspenders
  // backstop, not this gate. The ceiling itself is raised via APIFY_MAX_PLACES.
  maxPlaces: z.coerce.number().int().min(1, 'maxPlaces must be at least 1')
    .max(APIFY_MAX_PLACES_CEILING, `maxPlaces cannot exceed ${APIFY_MAX_PLACES_CEILING}`).optional(),
}).refine(d => d.provider !== 'csv' || !!d.csvContent, { message: 'csvContent is required for the csv provider' })

export const patchBusinessSchema = z.object({
  leadStatus: z.enum(['new', 'contacted', 'replied', 'won', 'lost', 'skipped']).optional(),
  note: z.string().max(2000).optional(),
}).refine(d => d.leadStatus !== undefined || d.note !== undefined, { message: 'nothing to update' })

export const patchScanSchema = z.object({
  pinned: z.boolean().optional(),
  archived: z.boolean().optional(),
  label: z.string().max(100).nullable().optional(),
  title: z.string().max(200).nullable().optional(),
}).refine(d => Object.values(d).some(v => v !== undefined), { message: 'nothing to update' })

export const putSettingsSchema = z.object({
  googleApiKey: z.string().min(1).optional(),
  apifyToken: z.string().min(1).optional(),
}).refine(d => d.googleApiKey !== undefined || d.apifyToken !== undefined, { message: 'nothing to update' })

export const resultsQuerySchema = z.object({
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  presence: z.enum(['none', 'alive', 'dead', 'parked', 'probe_failed']).optional(),
  leadStatus: z.enum(['new', 'contacted', 'replied', 'won', 'lost', 'skipped']).optional(),
})
