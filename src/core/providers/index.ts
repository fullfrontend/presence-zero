import { registerProvider } from './provider'
import { csvProvider } from './csv'
import { createOsmProvider } from './osm'
import { createGooglePlacesProvider } from './google-places'
import { createApifyProvider } from './apify'

export function registerBuiltInProviders(): void {
  registerProvider(csvProvider)
  registerProvider(createOsmProvider())
  registerProvider(createGooglePlacesProvider())
  registerProvider(createApifyProvider())
}
