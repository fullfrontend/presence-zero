import { describe, it, expect } from 'vitest'
import { scoreBand, scoreBarWidth } from '@/lib/score-display'

describe('score-display', () => {
  it('bands scores', () => {
    expect(scoreBand(90)).toBe('high')
    expect(scoreBand(70)).toBe('good')
    expect(scoreBand(50)).toBe('mid')
    expect(scoreBand(20)).toBe('low')
    expect(scoreBand(null)).toBe('none')
  })
  it('clamps bar width to 0-100%', () => {
    expect(scoreBarWidth(87)).toBe('87%')
    expect(scoreBarWidth(140)).toBe('100%')
    expect(scoreBarWidth(null)).toBe('0%')
  })
})
