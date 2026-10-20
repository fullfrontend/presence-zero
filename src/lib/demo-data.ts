import { explainBusinessScore } from '@/core/business-score'
export interface DemoResult {
  id: string
  name: string
  address: string | null
  phone: string | null
  rating: number | null
  reviewCount: number | null
  listedWebsite: string | null
  presenceStatus: 'not_found' | 'none' | 'facebook' | 'alive' | 'dead' | 'parked' | 'probe_failed'
  probeDetail: string | null
  score: number | null
  leadStatus: 'new' | 'contacted' | 'replied' | 'won' | 'lost' | 'skipped'
  note: string | null
  domains: { domain: string; available: boolean | null }[]
  seenBefore?: boolean
}

export const DEMO_SCAN: { location: string; category: string; results: DemoResult[] } = {
  location: 'Ottawa, ON',
  category: 'bakery',
  results: [
    {
      id: 'd1',
      name: 'Corner Crumb Bakehouse',
      address: '124 Bank St',
      phone: '(613) 555-0142',
      rating: 4.7,
      reviewCount: 212,
      listedWebsite: null,
      presenceStatus: 'none',
      probeDetail: 'No website listed on the source listing.',
      score: 75, // Includes 15 points for unverified presence
      leadStatus: 'new',
      note: null,
      domains: [
        { domain: 'cornercrumb.com', available: true },
        { domain: 'cornercrumbbakehouse.com', available: true },
      ],
    },
    {
      id: 'd2',
      name: 'Stone Mill Artisan Bread',
      address: '542 Rideau St',
      phone: '(613) 555-0187',
      rating: 4.6,
      reviewCount: 189,
      listedWebsite: null,
      presenceStatus: 'dead',
      probeDetail: 'Returned HTTP 503.',
      score: 95, // 35 + 25 + 10 + 15 + 10
      leadStatus: 'new',
      note: null,
      domains: [
        { domain: 'stonemillbread.com', available: true },
        { domain: 'stonemillartisan.com', available: false },
      ],
    },
    {
      id: 'd3',
      name: 'Whisk & Rise',
      address: '235 Elgin St',
      phone: '(613) 555-0201',
      rating: 4.8,
      reviewCount: 267,
      listedWebsite: null,
      presenceStatus: 'parked',
      probeDetail: 'Matched a registrar for-sale page.',
      score: 90, // 30 + 25 + 10 + 15 + 10
      leadStatus: 'new',
      note: null,
      domains: [
        { domain: 'whiskandrise.com', available: true },
        { domain: 'whiskrise.ca', available: true },
      ],
    },
    {
      id: 'd4',
      name: 'The Daily Crumb',
      address: '1050 Somerset St W',
      phone: '(613) 555-0156',
      rating: 4.5,
      reviewCount: 156,
      listedWebsite: null,
      presenceStatus: 'none',
      probeDetail: 'No website listed on the source listing.',
      score: 60, // Includes 15 points for unverified presence
      leadStatus: 'contacted',
      note: null,
      domains: [
        { domain: 'dailycrumb.com', available: false },
        { domain: 'thedailycrumb.ca', available: null },
      ],
    },
    {
      id: 'd5',
      name: 'Heritage Sourdough Co',
      address: '833 Bank St',
      phone: '(613) 555-0213',
      rating: 4.4,
      reviewCount: 143,
      listedWebsite: null,
      presenceStatus: 'dead',
      probeDetail: 'DNS lookup failed — the domain no longer resolves.',
      score: 80, // 35 + 25 + 10 + 0 + 10
      leadStatus: 'contacted',
      note: null,
      seenBefore: true,
      domains: [
        { domain: 'heritagesourdough.com', available: false },
        { domain: 'heritagesourdoughco.ca', available: false },
      ],
    },
    {
      id: 'd6',
      name: 'Crust & Crumb',
      address: '390 Tremblay Rd',
      phone: '(613) 555-0168',
      rating: 4.3,
      reviewCount: 98,
      listedWebsite: null,
      presenceStatus: 'parked',
      probeDetail: 'Matched a registrar for-sale page.',
      score: 75, // 30 + 25 + 10 + 0 + 10
      leadStatus: 'new',
      note: null,
      domains: [
        { domain: 'crustcrumb.com', available: false },
        { domain: 'crustandcrumb.ca', available: false },
      ],
    },
    {
      id: 'd7',
      name: 'Sweet Haven Bakery',
      address: '720 Echo Dr',
      phone: '(613) 555-0125',
      rating: null,
      reviewCount: 30,
      listedWebsite: null,
      presenceStatus: 'none',
      probeDetail: 'No website listed on the source listing.',
      score: 40, // Includes 15 points for unverified presence
      leadStatus: 'new',
      note: null,
      domains: [
        { domain: 'sweethavenbakery.com', available: false },
        { domain: 'sweethaven.ca', available: null },
      ],
    },
    {
      id: 'd8',
      name: 'Golden Grain Bakery',
      address: '512 Gladstone Ave',
      phone: '(613) 555-0134',
      rating: 4.0,
      reviewCount: 20,
      listedWebsite: null,
      presenceStatus: 'parked',
      probeDetail: 'Matched a registrar for-sale page.',
      score: 60, // 30 + 10 + 10 + 0 + 10
      leadStatus: 'won',
      note: 'Signed — 5-page site, build starts in Aug',
      domains: [
        { domain: 'goldengrainbakery.com', available: false },
        { domain: 'goldengrain.ca', available: false },
      ],
    },
    {
      id: 'd9',
      name: 'Rise & Shine',
      address: '1245 Wellington St',
      phone: '(613) 555-0179',
      rating: null,
      reviewCount: 25,
      listedWebsite: null,
      presenceStatus: 'dead',
      probeDetail: 'Timed out after 8s.',
      score: 58, // 35 + 13 + 0 + 0 + 10
      leadStatus: 'new',
      note: null,
      domains: [
        { domain: 'riseandshine.ca', available: false },
        { domain: 'riseshine.com', available: false },
      ],
    },
    {
      id: 'd14',
      name: 'Morning Glory Bakery',
      address: '1120 Colonel By Dr',
      phone: null,
      rating: null,
      reviewCount: 10,
      listedWebsite: null,
      presenceStatus: 'none',
      probeDetail: 'No website listed on the source listing.',
      score: 20, // Includes 15 points for unverified presence
      leadStatus: 'new',
      note: null,
      seenBefore: true,
      domains: [
        { domain: 'morningglory.com', available: false },
        { domain: 'morninglorybakery.ca', available: false },
      ],
    },
    {
      id: 'd10',
      name: 'Artisan Bakehouse',
      address: '450 Laurier Ave E',
      phone: '(613) 555-0190',
      rating: 4.6,
      reviewCount: 234,
      listedWebsite: 'https://artisanbakehouse.ca',
      presenceStatus: 'alive',
      probeDetail: 'Responded normally.',
      score: 0,
      leadStatus: 'skipped',
      note: null,
      domains: [],
    },
    {
      id: 'd11',
      name: 'Fresh Bake Daily',
      address: '678 Fifth Ave',
      phone: '(613) 555-0147',
      rating: 4.5,
      reviewCount: 198,
      listedWebsite: 'https://freshbakedaily.ca',
      presenceStatus: 'alive',
      probeDetail: 'Responded normally.',
      score: 0,
      leadStatus: 'skipped',
      note: null,
      domains: [],
    },
    {
      id: 'd12',
      name: 'Flour & Sugar Studio',
      address: '820 Catherine St',
      phone: '(613) 555-0167',
      rating: null,
      reviewCount: null,
      listedWebsite: null,
      presenceStatus: 'probe_failed',
      probeDetail: null,
      score: null,
      leadStatus: 'new',
      note: null,
      domains: [{ domain: 'floursugar.ca', available: null }],
    },
    {
      id: 'd13',
      name: 'The Bread Line',
      address: '245 Dalhousie St',
      phone: '(613) 555-0155',
      rating: 3.8,
      reviewCount: 31,
      listedWebsite: null,
      presenceStatus: 'probe_failed',
      probeDetail: null,
      score: null,
      leadStatus: 'new',
      note: null,
      domains: [{ domain: 'thebreadline.ca', available: false }],
    },
  ],
}

for (const row of DEMO_SCAN.results) row.score = explainBusinessScore(row, row.domains, 'ca').total
