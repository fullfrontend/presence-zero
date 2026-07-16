// Framework-free: no next/react/@/app imports. Shared by src/core/providers/osm.ts
// and the client new-scan form so category options stay in one place.

export const CATEGORY_TAGS: Record<string, string> = {
  restaurant: 'amenity=restaurant',
  cafe: 'amenity=cafe',
  bar: 'amenity=bar',
  pub: 'amenity=pub',
  fast_food: 'amenity=fast_food',
  dentist: 'amenity=dentist',
  doctor: 'amenity=doctors',
  pharmacy: 'amenity=pharmacy',
  veterinary: 'amenity=veterinary',
  bakery: 'shop=bakery',
  hairdresser: 'shop=hairdresser',
  butcher: 'shop=butcher',
  florist: 'shop=florist',
  car_repair: 'shop=car_repair',
  beauty: 'shop=beauty',
  optician: 'shop=optician',
  clothes: 'shop=clothes',
  jewelry: 'shop=jewelry',
  boutique: 'shop=boutique',
  plumber: 'craft=plumber',
  electrician: 'craft=electrician',
  carpenter: 'craft=carpenter',
  gym: 'leisure=fitness_centre',
}

export const SUPPORTED_OSM_CATEGORIES: string[] = Object.keys(CATEGORY_TAGS)

// Common synonyms / alternate phrasings that don't reduce to a key via simple
// plural stripping. Keys are lowercase, values must exist in CATEGORY_TAGS.
const SYNONYMS: Record<string, string> = {
  coffee: 'cafe',
  'coffee shop': 'cafe',
  salon: 'hairdresser',
  hairdressers: 'hairdresser',
  gp: 'doctor',
  doctors: 'doctor',
  vet: 'veterinary',
  vets: 'veterinary',
  clinic: 'doctor',
  fastfood: 'fast_food',
  'fast food': 'fast_food',
  gym: 'gym',
  fitness: 'gym',
  mechanic: 'car_repair',
  garage: 'car_repair',
}

function singularize(input: string): string[] {
  const candidates: string[] = []
  if (input.endsWith('ies')) candidates.push(input.slice(0, -3) + 'y')
  if (input.endsWith('s') && !input.endsWith('ss')) candidates.push(input.slice(0, -1))
  return candidates
}

export function resolveOsmCategory(input: string): string | null {
  const normalized = input.toLowerCase().trim()
  if (!normalized) return null
  if (normalized in CATEGORY_TAGS) return normalized
  if (normalized in SYNONYMS) return SYNONYMS[normalized]
  for (const candidate of singularize(normalized)) {
    if (candidate in CATEGORY_TAGS) return candidate
    if (candidate in SYNONYMS) return SYNONYMS[candidate]
  }
  return null
}
