export interface ScanArea { location: string; category: string; countryCode: string }
export interface RawBusiness {
  name: string; address?: string; phone?: string; category?: string
  rating?: number; reviewCount?: number; website?: string
}
export interface ProviderResult { businesses: RawBusiness[]; nextCursor: string | null }
export interface ProviderConfig { apiKey?: string; csvContent?: string }
export type PresenceStatus = 'none' | 'alive' | 'dead' | 'parked' | 'probe_failed'
export type LeadStatus = 'new' | 'contacted' | 'replied' | 'won' | 'lost' | 'skipped'
