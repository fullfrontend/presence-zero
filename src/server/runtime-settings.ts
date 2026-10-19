import { settings } from '@/db/schema'
import type { Db } from '@/db/client'
import { settingFields, type SettingsConfiguration } from '@/config/settings'

export const secretFields = {
  googleApiKey: { key: 'google_api_key', env: 'GOOGLE_PLACES_API_KEY' },
  apifyToken: { key: 'apify_token', env: 'APIFY_TOKEN' },
  braveSearchApiKey: { key: 'brave_search_api_key', env: 'BRAVE_SEARCH_API_KEY' },
} as const

export function resolveSettings(rows: { key: string; value: string }[], environment: Record<string, string | undefined> = process.env) {
  const stored = new Map(rows.map(row => [row.key, row.value]))
  const env = { ...environment }
  const configuration = {} as SettingsConfiguration
  for (const field of settingFields) {
    const override = stored.get(`config:${field.key}`)
    const inherited = environment[field.key] ?? field.default
    configuration[field.key] = {
      value: override ?? inherited, inherited,
      source: override !== undefined ? 'settings' : environment[field.key] !== undefined ? 'environment' : 'default',
    }
    // Leave absent defaults to domain validators (notably the required heavy model).
    if (override !== undefined) env[field.key] = override
  }
  const secrets = Object.fromEntries(Object.entries(secretFields).map(([name, field]) => {
    const override = stored.get(field.key)
    env[field.env] = override ?? environment[field.env]
    return [name, {
      configured: !!env[field.env]?.trim(),
      source: override !== undefined ? 'settings' : environment[field.env]?.trim() ? 'environment' : 'default',
    }]
  }))
  return { env, configuration, secrets }
}

export async function loadRuntimeSettings(db: Db) {
  return resolveSettings(await db.select().from(settings))
}
