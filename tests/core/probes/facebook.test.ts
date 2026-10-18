import { describe, expect, it, vi } from 'vitest'
import { isFacebookUrl } from '@/core/probes/facebook'
import { createWebsiteProbe } from '@/core/probes/website-probe'

describe('Facebook presence', () => {
  it.each(['https://www.facebook.com/restaurant', 'https://m.facebook.com/profile.php?id=123', 'facebook.com/restaurant', 'https://FB.COM/restaurant', 'https://fb.me/restaurant', 'https://facebook.com./restaurant'])('recognizes %s without probing Facebook', async url => {
    const fetchFn = vi.fn<typeof fetch>()
    const lookup = vi.fn()
    expect(isFacebookUrl(url)).toBe(true)
    expect((await createWebsiteProbe({ fetchFn, lookup })(url)).status).toBe('facebook')
    expect(fetchFn).not.toHaveBeenCalled()
    expect(lookup).not.toHaveBeenCalled()
  })
  it.each(['https://facebook.com.evil.example/page', 'https://notfacebook.com/', 'https://example.com/facebook.com', 'https://facebook.com@evil.example/', 'ftp://facebook.com/page', null])('rejects lookalikes or invalid URLs: %s', url => {
    expect(isFacebookUrl(url)).toBe(false)
  })
  it('classifies a website redirecting to Facebook as Facebook presence', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response('', {
      status: 302, headers: { Location: 'https://www.facebook.com/restaurant' },
    }))
    const result = await createWebsiteProbe({ fetchFn, lookup: async () => ['93.184.216.34'] })('https://restaurant.example')
    expect(result.status).toBe('facebook')
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })
})
