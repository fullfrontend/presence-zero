import type { RawBusiness } from '../types'
import { Provider, ProviderError } from './provider'

function parseLine(line: string): string[] {
  const out: string[] = []
  let cur = '', inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++ }
      else if (ch === '"') inQuotes = false
      else cur += ch
    } else if (ch === '"') inQuotes = true
    else if (ch === ',') { out.push(cur); cur = '' }
    else cur += ch
  }
  out.push(cur)
  return out.map(s => s.trim())
}

export function parseCsv(content: string): RawBusiness[] {
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0)
  if (lines.length < 2) throw new ProviderError('CSV must have a header row and at least one data row.')
  const header = parseLine(lines[0]).map(h => h.toLowerCase())
  const col = (name: string) => header.indexOf(name)
  if (col('name') === -1) throw new ProviderError('CSV is missing the required "name" column.')
  const get = (cells: string[], name: string) => {
    const i = col(name)
    return i === -1 || cells[i] === '' ? undefined : cells[i]
  }
  const num = (v: string | undefined) => {
    if (v === undefined) return undefined
    const n = Number(v)
    return Number.isFinite(n) ? n : undefined
  }
  return lines.slice(1).map(line => {
    const cells = parseLine(line)
    return {
      name: get(cells, 'name') ?? '',
      address: get(cells, 'address'),
      phone: get(cells, 'phone'),
      category: get(cells, 'category'),
      rating: num(get(cells, 'rating')),
      reviewCount: num(get(cells, 'review_count')),
      website: get(cells, 'website'),
    }
  }).filter(b => b.name.length > 0)
}

export const csvProvider: Provider = {
  id: 'csv',
  async fetchPage(_area, _cursor, config) {
    if (!config.csvContent) throw new ProviderError('CSV provider requires uploaded CSV content.')
    return { businesses: parseCsv(config.csvContent), nextCursor: null }
  },
}
