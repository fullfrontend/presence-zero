import { describe, it, expect } from 'vitest'
import { generatePitch } from '@/core/pitch'

const base = { name: 'Corner Crumb Bakehouse', category: 'bakery', location: 'Ottawa, ON' }

describe('generatePitch', () => {
  it('requires verification before pitching an unlisted website', () => {
    const p = generatePitch({ ...base, presence: 'none', rating: 4.7, reviewCount: 212, availableDomain: 'cornercrumb.com' })
    const text = [p.headline, p.angle, ...p.talkingPoints].join(' ').toLowerCase()
    expect(text).toContain('verify')
    expect(text).not.toContain('no website at all')
  })

  it('frames a dead-site lead around the site being down', () => {
    const p = generatePitch({ ...base, presence: 'dead', rating: 4.6, reviewCount: 100, availableDomain: null })
    expect([p.headline, p.angle, ...p.talkingPoints].join(' ').toLowerCase()).toMatch(/down|dead|not load|offline/)
  })

  it('frames a parked-domain lead around the domain being parked/for sale', () => {
    const p = generatePitch({ ...base, presence: 'parked', rating: 4.8, reviewCount: 267, availableDomain: null })
    expect([p.headline, p.angle, ...p.talkingPoints].join(' ').toLowerCase()).toMatch(/park|for sale/)
  })

  it('turns strong reviews + rating into a social-proof talking point', () => {
    const p = generatePitch({ ...base, presence: 'none', rating: 4.7, reviewCount: 212, availableDomain: null })
    expect(p.talkingPoints.some(t => t.includes('212') && /4\.7/.test(t))).toBe(true)
  })

  it('name-drops an available domain and echoes it in suggestedDomain', () => {
    const p = generatePitch({ ...base, presence: 'none', rating: 4.7, reviewCount: 212, availableDomain: 'cornercrumb.com' })
    expect(p.suggestedDomain).toBe('cornercrumb.com')
    expect(p.talkingPoints.some(t => t.includes('cornercrumb.com'))).toBe(true)
  })

  it('omits missing signals without emitting undefined/null/NaN', () => {
    const p = generatePitch({ name: 'Some Shop', presence: 'none', rating: null, reviewCount: null, availableDomain: null })
    const text = [p.headline, p.angle, ...p.talkingPoints].join(' ')
    expect(text).not.toMatch(/undefined|null|NaN/)
    expect(p.suggestedDomain).toBeUndefined()
  })

  it('has no subject–verb agreement slips for any lead presence', () => {
    for (const presence of ['none', 'dead', 'parked'] as const) {
      const p = generatePitch({ name: 'Some Shop', presence, rating: 4.5, reviewCount: 120, availableDomain: null })
      const text = [p.headline, p.angle, ...p.talkingPoints].join(' ')
      expect(text).not.toMatch(/\bthey has\b/i)
    }
  })

  it('is deterministic', () => {
    const input = { ...base, presence: 'none', rating: 4.7, reviewCount: 212, availableDomain: 'cornercrumb.com' } as const
    expect(generatePitch(input)).toEqual(generatePitch(input))
  })

  it('returns a minimal pitch for non-lead presence (alive)', () => {
    const p = generatePitch({ ...base, presence: 'alive', rating: 4.6, reviewCount: 234, availableDomain: null })
    expect(p.talkingPoints.length).toBe(0)
    expect(p.suggestedDomain).toBeUndefined()
  })
})

it('suggests complementing Facebook without claiming an independent site is absent', () => {
  const pitch = generatePitch({ name: 'Restaurant', presence: 'facebook' })
  expect(pitch.headline).toContain('Facebook')
  expect(pitch.angle).toContain('Check whether a separate website already exists')
  expect(pitch.angle).not.toContain('already has a working site')
})
