import { expect, it } from 'vitest'
import { GOOGLE_PLACE_TYPES, findGooglePlaceTypes, isGooglePlaceType } from '@/core/providers/google-place-types'

it('offers unique official Table A types, including recent food types, but excludes response-only values', () => {
  expect(new Set(GOOGLE_PLACE_TYPES).size).toBe(GOOGLE_PLACE_TYPES.length)
  for (const type of ['belgian_restaurant', 'bistro', 'dentist', 'car_repair', 'bakery']) expect(isGooglePlaceType(type)).toBe(true)
  for (const type of ['establishment', 'point_of_interest', 'food', 'not_a_type']) expect(isGooglePlaceType(type)).toBe(false)
})
it('matches words in any order, canonical identifiers, translated labels and accents', () => {
  expect(findGooglePlaceTypes('restaurant belgian')).toEqual(['belgian_restaurant'])
  expect(findGooglePlaceTypes('belgian_restaurant')).toEqual(['belgian_restaurant'])
  expect(findGooglePlaceTypes('EPICERIE', type => type === 'grocery_store' ? 'épicerie' : type)).toContain('grocery_store')
  expect(findGooglePlaceTypes('zzzzzz')).toEqual([])
  expect(findGooglePlaceTypes('restaurant')[0]).toBe('restaurant')
})
