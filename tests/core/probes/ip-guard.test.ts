import { describe, it, expect } from 'vitest'
import { isBlockedAddress } from '@/core/probes/ip-guard'

describe('isBlockedAddress', () => {
  it('blocks IPv4 private / loopback / link-local / metadata / unspecified', () => {
    for (const ip of ['127.0.0.1', '127.5.5.5', '10.0.0.5', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '0.0.0.0', '100.64.0.1']) {
      expect(isBlockedAddress(ip), ip).toBe(true)
    }
  })

  it('allows public IPv4', () => {
    for (const ip of ['8.8.8.8', '1.1.1.1', '93.184.216.34', '172.15.0.1', '172.32.0.1']) {
      expect(isBlockedAddress(ip), ip).toBe(false)
    }
  })

  it('blocks IPv6 loopback / ULA / link-local and IPv4-mapped private', () => {
    for (const ip of ['::1', 'fc00::1', 'fd12:3456::1', 'fe80::1', '::ffff:10.0.0.1', '::ffff:127.0.0.1', '::']) {
      expect(isBlockedAddress(ip), ip).toBe(true)
    }
  })

  it('allows public IPv6', () => {
    for (const ip of ['2606:4700:4700::1111', '2001:4860:4860::8888', '::ffff:8.8.8.8']) {
      expect(isBlockedAddress(ip), ip).toBe(false)
    }
  })

  it('fails closed on malformed input', () => {
    for (const ip of ['', 'not-an-ip', '999.999.999.999', '10.0.0', 'localhost']) {
      expect(isBlockedAddress(ip), ip).toBe(true)
    }
  })
})
