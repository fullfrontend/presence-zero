import { isGooglePlaceType } from './google-place-types'
import { coordinates } from '../coordinates'
import type { RawBusiness } from '../types'
import { Provider, ProviderError } from './provider'

const FIELD_MASK = [
  'places.displayName', 'places.formattedAddress', 'places.nationalPhoneNumber',
  'places.websiteUri', 'places.rating', 'places.userRatingCount', 'places.primaryTypeDisplayName',
  'places.location', 'places.googleMapsUri', 'nextPageToken',
].join(',')

interface GooglePlace {
  location?: { latitude?: number; longitude?: number }
  displayName?: { text?: string }; formattedAddress?: string; nationalPhoneNumber?: string
  googleMapsUri?: string; websiteUri?: string; rating?: number; userRatingCount?: number; primaryTypeDisplayName?: { text?: string }
}

export function createGooglePlacesProvider(fetchFn: typeof fetch = fetch): Provider {
  return {
    id: 'google',
    async fetchPage(area, cursor, config) {
      if (!config.apiKey) {
        throw new ProviderError('Google Places requires an API key — add one in Settings or set GOOGLE_PLACES_API_KEY.')
      }
      const category = area.category.trim()
      const knownType = isGooglePlaceType(category)
      const body: Record<string, unknown> = {
        textQuery: `${knownType ? category.replace(/_/g, ' ') : category} in ${area.location}`, pageSize: 20,
        ...(knownType ? { includedType: category, strictTypeFiltering: true } : {}),
      }
      if (cursor) body.pageToken = cursor
      const res = await fetchFn('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': config.apiKey, 'X-Goog-FieldMask': FIELD_MASK },
        body: JSON.stringify(body),
      })
      if (res.status === 429) throw new ProviderError('Google free tier exhausted — resumes at midnight PT, or switch provider.', true)
      if (res.status === 400 || res.status === 403) throw new ProviderError('Google rejected the API key — check it is valid and "Places API (New)" is enabled.')
      if (!res.ok) throw new ProviderError(`Google Places error (HTTP ${res.status}).`, true)
      const data = (await res.json()) as { places?: GooglePlace[]; nextPageToken?: string }
      const businesses: RawBusiness[] = (data.places ?? [])
        .filter(p => p.displayName?.text)
        .map(p => ({
          name: p.displayName!.text!,
          address: p.formattedAddress,
          ...coordinates(p.location?.latitude, p.location?.longitude),
          phone: p.nationalPhoneNumber,
          website: p.websiteUri,
          sourceUrl: p.googleMapsUri,
          rating: p.rating,
          reviewCount: p.userRatingCount,
          category: p.primaryTypeDisplayName?.text,
        }))
      return { businesses, nextCursor: data.nextPageToken ?? null }
    },
  }
}
