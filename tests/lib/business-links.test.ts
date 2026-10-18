import { expect, it } from 'vitest'
import { businessLinks, safeWebUrl } from '@/lib/business-links'

it('shows independent website, Facebook and the exact source link separately', () => {
  expect(businessLinks({ listedWebsite: 'restaurant.example', facebookUrl: 'https://facebook.com/restaurant', sourceUrl: 'https://www.openstreetmap.org/way/123' })).toEqual({
    website: 'https://restaurant.example/', facebook: 'https://facebook.com/restaurant',
    source: 'https://www.openstreetmap.org/way/123', sourceLabel: 'OpenStreetMap',
  })
})
it('handles legacy Facebook URLs without listing them as independent websites', () => {
  expect(businessLinks({ listedWebsite: 'https://m.facebook.com/restaurant' })).toMatchObject({
    website: null, facebook: 'https://m.facebook.com/restaurant', source: null,
  })
})
it('labels a Google Maps place link', () => {
  expect(businessLinks({ sourceUrl: 'https://maps.google.com/?cid=123' })).toMatchObject({ sourceLabel: 'Google Places', source: 'https://maps.google.com/?cid=123' })
})
it.each(['javascript:alert(1)', 'data:text/html,test', 'ftp://example.com', 'https://user:password@example.com'])('rejects unsafe links: %s', value => {
  expect(safeWebUrl(value)).toBeNull()
})
it('does not invent missing links or accept a lookalike source', () => {
  expect(businessLinks({})).toMatchObject({ website: null, facebook: null, source: null })
  expect(businessLinks({ sourceUrl: 'https://google.com.evil.example' }).source).toBeNull()
})
