export interface Step {
  n: string
  title: string
  body: string
  href?: string
  linkLabel?: string
}

export const GOOGLE_STEPS: Step[] = [
  {
    n: '01',
    title: 'Open the Google Cloud Console',
    body: 'Sign in with any Google account — no credit card needed to get started.',
    href: 'https://console.cloud.google.com/',
    linkLabel: 'console.cloud.google.com',
  },
  {
    n: '02',
    title: 'Create or select a project',
    body: 'Use the project picker at the top of the console. Any project works — a fresh one is fine.',
  },
  {
    n: '03',
    title: 'Enable the Places API (New)',
    body: 'Search the API library for it and click Enable for your project.',
    href: 'https://console.cloud.google.com/apis/library/places.googleapis.com',
    linkLabel: 'Enable Places API (New)',
  },
  {
    n: '04',
    title: 'Create an API key',
    body: 'Under Credentials, choose Create credentials → API key.',
    href: 'https://console.cloud.google.com/apis/credentials',
    linkLabel: 'Open Credentials',
  },
  {
    n: '05',
    title: 'Copy the key and paste it above',
    body: 'Save it in the form above — it stays in your own database and is only ever sent to Google. The free tier covers typical use. You can also set it as the GOOGLE_PLACES_API_KEY environment variable instead.',
  },
]

export const APIFY_STEPS: Step[] = [
  {
    n: '01',
    title: 'Create a free Apify account',
    body: 'No credit card. The free plan renews $5 of platform credit every month — about 1,250 places.',
    href: 'https://apify.com/',
    linkLabel: 'apify.com',
  },
  {
    n: '02',
    title: 'Open Settings → API & Integrations',
    body: 'In the Apify Console sidebar, choose Settings, then the API & Integrations tab.',
    href: 'https://console.apify.com/settings/integrations',
    linkLabel: 'Open API & Integrations',
  },
  {
    n: '03',
    title: 'Copy your Personal API token',
    body: 'Paste it above and save. It is stored in your own database and sent only to Apify.',
  },
]


