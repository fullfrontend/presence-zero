/**
 * SSRF address guard. Returns true when an IP literal must NOT be fetched
 * (private, loopback, link-local, unique-local, carrier-grade NAT, cloud
 * metadata, multicast/reserved, or unparseable). Fails closed: anything we
 * cannot confidently classify as public is blocked.
 */

function parseIPv4(ip: string): number[] | null {
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  const octets: number[] = []
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null
    const n = Number(p)
    if (n > 255) return null
    octets.push(n)
  }
  return octets
}

function blockedIPv4(o: number[]): boolean {
  const [a, b] = o
  if (a === 0) return true                              // 0.0.0.0/8 (incl. unspecified)
  if (a === 10) return true                             // 10.0.0.0/8
  if (a === 127) return true                            // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true               // 169.254.0.0/16 link-local (incl. metadata)
  if (a === 172 && b >= 16 && b <= 31) return true      // 172.16.0.0/12
  if (a === 192 && b === 168) return true               // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true     // 100.64.0.0/10 CGNAT
  if (a === 192 && b === 0 && o[2] === 0) return true    // 192.0.0.0/24 IETF protocol
  if (a === 192 && b === 0 && o[2] === 2) return true    // 192.0.2.0/24 TEST-NET-1
  if (a === 198 && (b === 18 || b === 19)) return true   // 198.18.0.0/15 benchmark
  if (a === 198 && b === 51 && o[2] === 100) return true // 198.51.100.0/24 TEST-NET-2
  if (a === 203 && b === 0 && o[2] === 113) return true  // 203.0.113.0/24 TEST-NET-3
  if (a >= 224) return true                             // 224.0.0.0/4 multicast + 240.0.0.0/4 reserved
  return false
}

/** Expand an IPv6 literal to 8 hextets (numbers), or null if malformed. */
function parseIPv6(ip: string): number[] | null {
  let text = ip
  let tail: number[] = []

  // Embedded IPv4 (e.g. ::ffff:1.2.3.4) — convert the trailing dotted quad to two hextets.
  const lastColon = text.lastIndexOf(':')
  if (text.includes('.')) {
    const v4 = parseIPv4(text.slice(lastColon + 1))
    if (!v4) return null
    tail = [(v4[0] << 8) | v4[1], (v4[2] << 8) | v4[3]]
    text = text.slice(0, lastColon + 1) + '0:0'
  }

  const dbl = text.split('::')
  if (dbl.length > 2) return null

  const toHextets = (s: string): number[] | null => {
    if (s === '') return []
    const out: number[] = []
    for (const part of s.split(':')) {
      if (!/^[0-9a-fA-F]{1,4}$/.test(part)) return null
      out.push(parseInt(part, 16))
    }
    return out
  }

  let hextets: number[]
  if (dbl.length === 2) {
    const head = toHextets(dbl[0])
    const rest = toHextets(dbl[1])
    if (!head || !rest) return null
    const fill = 8 - (head.length + rest.length)
    if (fill < 0) return null
    hextets = [...head, ...Array(fill).fill(0), ...rest]
  } else {
    const all = toHextets(text)
    if (!all) return null
    hextets = all
  }

  // Fold the embedded-IPv4 tail back in when we substituted it above.
  if (tail.length === 2 && ip.includes('.')) {
    hextets = [...hextets.slice(0, 6), ...tail]
  }
  return hextets.length === 8 ? hextets : null
}

function blockedIPv6(h: number[]): boolean {
  const isZero = h.every(x => x === 0)
  if (isZero) return true                               // :: unspecified
  if (h.slice(0, 7).every(x => x === 0) && h[7] === 1) return true // ::1 loopback
  const first = h[0]
  if ((first & 0xfe00) === 0xfc00) return true          // fc00::/7 unique-local
  if ((first & 0xffc0) === 0xfe80) return true          // fe80::/10 link-local
  if ((first & 0xff00) === 0xff00) return true          // ff00::/8 multicast
  // IPv4-mapped ::ffff:a.b.c.d — classify by the embedded IPv4.
  if (h.slice(0, 5).every(x => x === 0) && h[5] === 0xffff) {
    const o = [h[6] >> 8, h[6] & 0xff, h[7] >> 8, h[7] & 0xff]
    return blockedIPv4(o)
  }
  return false
}

export function isBlockedAddress(ip: string): boolean {
  const trimmed = ip.trim()
  if (!trimmed) return true
  const v4 = parseIPv4(trimmed)
  if (v4) return blockedIPv4(v4)
  const v6 = parseIPv6(trimmed)
  if (v6) return blockedIPv6(v6)
  return true // unparseable → fail closed
}
