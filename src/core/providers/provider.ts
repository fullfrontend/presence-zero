import type { ProviderConfig, ProviderResult, ScanArea } from '../types'

export interface Provider {
  id: string
  fetchPage(area: ScanArea, cursor: string | null, config: ProviderConfig): Promise<ProviderResult>
}

export class ProviderError extends Error {
  constructor(message: string, public readonly recoverable = false) {
    super(message)
    this.name = 'ProviderError'
  }
}

const registry = new Map<string, Provider>()

export function registerProvider(p: Provider): void { registry.set(p.id, p) }

export function getProvider(id: string): Provider {
  const p = registry.get(id)
  if (!p) throw new Error(`Unknown provider: ${id}`)
  return p
}
