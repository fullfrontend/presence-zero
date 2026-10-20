import { expect, it, vi } from 'vitest'
import { createBelgiumDasQuery } from '@/core/probes/belgium-das'

it('reserves distinct query slots even for simultaneous requests', async () => {
  const sleep = vi.fn(async () => {})
  const request = vi.fn(async () => 'response')
  const query = createBelgiumDasQuery({ now: () => 10000, sleep, request })
  expect(await Promise.all(['one.be', 'two.be', 'three.be'].map(query))).toEqual(['response', 'response', 'response'])
  expect(sleep.mock.calls).toEqual([[1500], [3000]])
  expect(request).toHaveBeenCalledTimes(3)
})
it('rejects invalid domain input before opening a connection', async () => {
  const request = vi.fn()
  const query = createBelgiumDasQuery({ request })
  for (const name of ['test.com', 'test.be\r\nother.be', '../test.be', '-test.be']) expect(await query(name)).toBe('')
  expect(request).not.toHaveBeenCalled()
})
