interface GooglePhoneSearchResult {
  places?: Array<{ nationalPhoneNumber?: string }>
}

/**
 * Best-effort Google Places phone lookup used to backfill leads that have no phone
 * number from their original provider. Never throws — any failure (network error,
 * non-ok response, malformed JSON) resolves to `null` so a failed lookup can never
 * fail a scan.
 */
export function createGooglePhoneLookup(
  apiKey: string,
  fetchFn: typeof fetch = fetch,
): (name: string, address: string | null) => Promise<string | null> {
  return async (name, address) => {
    try {
      const res = await fetchFn('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.nationalPhoneNumber',
        },
        body: JSON.stringify({ textQuery: `${name} ${address ?? ''}`.trim(), pageSize: 1 }),
      })
      if (!res.ok) return null
      const data = (await res.json()) as GooglePhoneSearchResult
      return data.places?.[0]?.nationalPhoneNumber ?? null
    } catch {
      return null
    }
  }
}
