import { z } from 'zod'

export const createScanSchema = z.object({
  location: z.string().min(1, 'location is required'),
  category: z.string().min(1, 'category is required'),
  countryCode: z.string().length(2).default('us'),
  provider: z.enum(['google', 'osm', 'csv']),
  csvContent: z.string().optional(),
}).refine(d => d.provider !== 'csv' || !!d.csvContent, { message: 'csvContent is required for the csv provider' })

export const patchBusinessSchema = z.object({
  leadStatus: z.enum(['new', 'contacted', 'replied', 'won', 'lost', 'skipped']).optional(),
  note: z.string().max(2000).optional(),
}).refine(d => d.leadStatus !== undefined || d.note !== undefined, { message: 'nothing to update' })

export const putSettingsSchema = z.object({ googleApiKey: z.string().min(1) })

export const resultsQuerySchema = z.object({
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  presence: z.enum(['none', 'alive', 'dead', 'parked', 'probe_failed']).optional(),
  leadStatus: z.enum(['new', 'contacted', 'replied', 'won', 'lost', 'skipped']).optional(),
})
