import type { Guide } from './types'
import { findBusinessesWithoutWebsites } from './find-businesses-without-websites'
import { getWebDesignClients } from './get-web-design-clients'
import { sellWebsitesToLocalBusinesses } from './sell-websites-local-businesses'
import { parkedDomainsDeadWebsites } from './parked-domains-dead-websites'
import { checkDomainAvailabilityRdap } from './check-domain-availability-rdap'
import { googleMapsLeadsDataSources } from './google-maps-leads-data-sources'

export type { Guide, GuideSection, GuideFaq } from './types'

/** Display order on the hub; the first entry is the featured pillar guide. */
export const GUIDES: Guide[] = [
  findBusinessesWithoutWebsites,
  getWebDesignClients,
  sellWebsitesToLocalBusinesses,
  parkedDomainsDeadWebsites,
  checkDomainAvailabilityRdap,
  googleMapsLeadsDataSources,
]

export const getGuide = (slug: string) => GUIDES.find(g => g.slug === slug)

export const guidePath = (slug: string) => `/guides/${slug}`

export const guideOgPath = (slug: string) => `/og/${slug}`
