import { expect, it } from 'vitest'
import { coordinates } from '@/core/coordinates'
import { parseCsv } from '@/core/providers/csv'
import { mapApifyPlace } from '@/core/providers/apify'

it('preserves valid zero coordinates and rejects partial, non-finite and out-of-range pairs', () => {
  expect(coordinates(0, 0)).toEqual({ latitude: 0, longitude: 0 })
  for (const pair of [[null, null], [45, undefined], [91, 10], [10, -181], [NaN, 0], [Infinity, 10], ['45', 10]]) {
    expect(coordinates(...pair as [unknown, unknown])).toEqual({})
  }
})
it('reads optional CSV coordinates without inventing positions for empty cells', () => {
  const rows = parseCsv('name,latitude,longitude\nA,50.4,4.4\nB,,\nC,100,4')
  expect(rows[0]).toMatchObject({ latitude: 50.4, longitude: 4.4 })
  expect(rows[1].latitude).toBeUndefined()
  expect(rows[2].longitude).toBeUndefined()
})
it('maps Apify location pairs defensively', () => {
  expect(mapApifyPlace({ title: 'A', location: { lat: 50.4, lng: 4.4 } })).toMatchObject({ latitude: 50.4, longitude: 4.4 })
  expect(mapApifyPlace({ title: 'B', location: 'invalid' })?.latitude).toBeUndefined()
})
