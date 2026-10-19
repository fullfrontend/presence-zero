import { describe, expect, it } from 'vitest'
import { normalizeLocale, resolveLocale } from '@/i18n/config'
import { createTranslator, formatDate, formatNumber, translateSystem } from '@/i18n/translate'
import fr from '@/i18n/fr-FR.json'
import en from '@/i18n/en-US.json'
import { generatePitch } from '@/core/pitch'
import { computeScore } from '@/core/scoring'
import { pitchForRow, buildPitchText } from '@/lib/score-explain'

describe('request locale selection', () => {
  it('canonicalizes supported region tags and rejects unrelated or malformed cookies', () => {
    expect(normalizeLocale('FR-fr')).toBe('fr-FR')
    expect(normalizeLocale('EN-us')).toBe('en-US')
    expect(normalizeLocale('fr')).toBeNull()
    expect(normalizeLocale('../../fr-FR')).toBeNull()
  })
  it('prioritizes an explicit cookie, then weighted browser languages, then configured fallback', () => {
    expect(resolveLocale('en-US', 'fr-FR', 'fr-FR')).toBe('en-US')
    expect(resolveLocale(undefined, 'de, en;q=0.4,fr-BE;q=0.8')).toBe('fr-FR')
    expect(resolveLocale('invalid', 'fr;q=0,en-GB;q=0.5')).toBe('en-US')
    expect(resolveLocale(undefined, 'de,fr;q=bad', 'FR-fr')).toBe('fr-FR')
    expect(resolveLocale(undefined, undefined, 'invalid')).toBe('en-US')
    expect(resolveLocale(undefined, 'en;q=1.5,fr;q=0.2')).toBe('fr-FR')
  })
})

describe('translation and regional formats', () => {
  it('keeps catalogs aligned and preserves interpolation placeholders', () => {
    expect(Object.keys(fr).sort()).toEqual(Object.keys(en).sort())
    for (const [key, value] of Object.entries(fr)) {
      expect(value.trim(), key).not.toBe('')
      expect(value.match(/\{\w+\}/g)?.sort() ?? [], key).toEqual(key.match(/\{\w+\}/g)?.sort() ?? [])
    }
  })
  it('translates labels, preserves boundary spaces and does not reinterpret parameter values', () => {
    const t = createTranslator('fr-FR')
    expect(t('Settings')).toBe('Paramètres')
    expect(t(' Settings ')).toBe(' Paramètres ')
    expect(t('Select {0}', { 0: '<script>{1}</script>' })).toBe('Sélectionner <script>{1}</script>')
    expect(t('Unknown source text')).toBe('Unknown source text')
    expect(createTranslator('en-US')('Continue scan')).toBe('Continue scan')
  })
  it('formats numbers and dates explicitly without depending on the host timezone', () => {
    expect(formatNumber('fr-FR', 1234.5)).toBe('1\u202f234,5')
    expect(formatNumber('en-US', 1234.5)).toBe('1,234.5')
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' } as const
    expect(formatDate('fr-FR', '2026-10-19T23:30:00Z', options)).toBe('19/10/2026')
    expect(formatDate('en-US', '2026-10-19T23:30:00Z', options)).toBe('10/19/2026')
    expect(formatDate('fr-FR', 'invalid')).toBe('—')
  })
  it('translates stored diagnostics while retaining external messages unchanged', () => {
    expect(translateSystem('fr-FR', 'Rating 4.6')).toBe('Note 4,6')
    expect(translateSystem('fr-FR', 'Returned HTTP 503.')).toBe('Réponse HTTP 503.')
    expect(translateSystem('fr-FR', 'Google Places error (HTTP 429).')).toBe('Erreur Google Places (HTTP 429).')
    expect(translateSystem('en-US', 'Returned HTTP 503.')).toBe('Returned HTTP 503.')
    expect(translateSystem('fr-FR', 'Unknown vendor response.')).toBe('Unknown vendor response.')
  })
  it('localizes pitch presentation without translating names, domains or altering scores', () => {
    const row = { name: 'Settings', phone: null, rating: 4.5, reviewCount: 12, presenceStatus: 'none', score: 30,
      domains: [{ domain: 'settings.example', available: true }] }
    const t = createTranslator('fr-FR')
    const pitch = pitchForRow(row, 'New York', t)
    expect(pitch.angle).toContain('Settings')
    expect(pitch.angle).not.toContain('Paramètres')
    expect(pitch.talkingPoints[0]).toContain('12 avis')
    expect(pitch.talkingPoints[0]).toContain('4,5★')
    expect(buildPitchText(pitch, t)).toContain('Domaine suggéré : settings.example')
    expect(generatePitch({ name: 'Settings', presence: 'none' }).headline).toBe('Website presence needs verification.')
    expect(computeScore({ presence: 'not_found', rating: 4.5, reviewCount: 12, exactComAvailable: true, hasPhone: true })).toBeGreaterThan(0)
    expect(row.presenceStatus).toBe('none')
  })
})
