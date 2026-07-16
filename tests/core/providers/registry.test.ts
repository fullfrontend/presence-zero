import { describe, it, expect } from 'vitest'
import { registerProvider, getProvider, ProviderError } from '@/core/providers/provider'

describe('provider registry', () => {
  it('registers and retrieves a provider', () => {
    const fake = { id: 'fake', fetchPage: async () => ({ businesses: [], nextCursor: null }) }
    registerProvider(fake)
    expect(getProvider('fake')).toBe(fake)
  })
  it('throws on unknown provider', () => {
    expect(() => getProvider('nope')).toThrow('Unknown provider: nope')
  })
  it('ProviderError carries recoverable flag', () => {
    expect(new ProviderError('x', true).recoverable).toBe(true)
    expect(new ProviderError('x').recoverable).toBe(false)
  })
})
