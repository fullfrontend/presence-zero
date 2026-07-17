import { z } from 'zod'

export const createScanSchema = z.object({
  location: z.string().min(1, 'location is required'),
  category: z.string().min(1, 'category is required'),
  countryCode: z.string().length(2).default('us'),
  provider: z.enum(['google', 'osm', 'csv', 'apify']),
  csvContent: z.string().optional(),
  // Route-boundary cost ceiling: Apify bills $0.004/place. This must REJECT above 100,
  // not clamp — the caller needs to learn their request was refused. The provider also
  // clamps defensively in core, but that's a belt-and-suspenders backstop, not this gate.
  maxPlaces: z.coerce.number().int().min(1, 'maxPlaces must be at least 1')
    .max(100, 'maxPlaces cannot exceed 100').optional(),
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
