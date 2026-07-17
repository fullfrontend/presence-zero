import { describe, it, expect } from 'vitest'
import { patchScanSchema, createScanSchema, putSettingsSchema } from '@/server/validation'

describe('patchScanSchema', () => {
  it('accepts a partial update with a single field', () => {
    const result = patchScanSchema.safeParse({ pinned: true })
    expect(result.success).toBe(true)
  })

  it('accepts all fields together', () => {
    const result = patchScanSchema.safeParse({
      pinned: true, archived: false, label: 'clients', title: 'Ottawa bakeries',
    })
    expect(result.success).toBe(true)
  })

  it('accepts null for label and title (clears the value)', () => {
    const result = patchScanSchema.safeParse({ label: null, title: null })
    expect(result.success).toBe(true)
  })

  it('rejects an empty object with "nothing to update"', () => {
    const result = patchScanSchema.safeParse({})
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0].message).toBe('nothing to update')
  })

  it('rejects a label over 100 characters', () => {
    const result = patchScanSchema.safeParse({ label: 'x'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('rejects a title over 200 characters', () => {
    const result = patchScanSchema.safeParse({ title: 'x'.repeat(201) })
    expect(result.success).toBe(false)
  })

  it('rejects wrong types for pinned/archived', () => {
    expect(patchScanSchema.safeParse({ pinned: 'yes' }).success).toBe(false)
    expect(patchScanSchema.safeParse({ archived: 'no' }).success).toBe(false)
  })

  it('rejects wrong types for label/title', () => {
    expect(patchScanSchema.safeParse({ label: 123 }).success).toBe(false)
    expect(patchScanSchema.safeParse({ title: 123 }).success).toBe(false)
  })
})

describe('apify validation', () => {
  const base = { location: 'Ottawa, ON', category: 'bakery', countryCode: 'ca', provider: 'apify' as const }

  it('accepts the apify provider with a maxPlaces in range', () => {
    expect(createScanSchema.parse({ ...base, maxPlaces: 40 }).maxPlaces).toBe(40)
  })
  it('rejects a maxPlaces above the 100 ceiling', () => {
    expect(createScanSchema.safeParse({ ...base, maxPlaces: 5000 }).success).toBe(false)
  })
  it('rejects a maxPlaces below 1', () => {
    expect(createScanSchema.safeParse({ ...base, maxPlaces: 0 }).success).toBe(false)
  })
  it('accepts either secret alone but rejects an empty payload', () => {
    expect(putSettingsSchema.safeParse({ apifyToken: 'tok' }).success).toBe(true)
    expect(putSettingsSchema.safeParse({ googleApiKey: 'k' }).success).toBe(true)
    expect(putSettingsSchema.safeParse({}).success).toBe(false)
  })
})
