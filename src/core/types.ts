export interface ScanArea { location: string; category: string; countryCode: string }
export interface RawBusiness {
  name: string; address?: string; phone?: string; category?: string
  rating?: number; reviewCount?: number; website?: string; facebookUrl?: string; sourceUrl?: string; closed?: boolean
}
export interface ProviderResult { businesses: RawBusiness[]; nextCursor: string | null }
export interface ProviderConfig { apiKey?: string; csvContent?: string; apifyToken?: string; maxPlaces?: number }
export type PresenceStatus = 'not_found' | 'none' | 'facebook' | 'alive' | 'dead' | 'parked' | 'probe_failed'
