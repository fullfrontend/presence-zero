/** Match the hostname, never a path, query parameter or lookalike domain. */
export function isFacebookUrl(value: string | null | undefined): boolean {
  if (!value) return false
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return false
    const host = url.hostname.toLowerCase().replace(/\.$/, '')
    return ['facebook.com', 'fb.com', 'fb.me'].some(domain => host === domain || host.endsWith(`.${domain}`))
  } catch {
    return false
  }
}

export const FACEBOOK_DETAIL = 'The supplied URL is a Facebook page, not an independent website. A separate website may still exist.'
