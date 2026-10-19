import { expect, it } from 'vitest'
import { readAuditConfig } from '@/server/audit-config'

it('is disabled by default and needs an explicit local model when enabled', () => {
  expect(readAuditConfig({})).toBeNull()
  expect(() => readAuditConfig({ AI_AUDIT_ENABLED: 'true' })).toThrow('OLLAMA_MODEL')
  expect(readAuditConfig({ AI_AUDIT_ENABLED: 'true', OLLAMA_MODEL: 'my-local-model' })).toMatchObject({
    OLLAMA_BASE_URL: 'http://127.0.0.1:11434', AI_AUDIT_LANGUAGE: 'fr', AI_AUDIT_MAX_PAGES: 3,
  })
})

it.each([
  { OLLAMA_BASE_URL: 'https://ollama.com' }, { OLLAMA_BASE_URL: 'http://user:pass@localhost:11434' },
  { OLLAMA_BASE_URL: 'file:///tmp/model' }, { OLLAMA_MODEL: 'model:cloud' },
  { AI_AUDIT_MAX_PAGES: '1000' }, { OLLAMA_TIMEOUT_MS: 'oops' }, { AI_AUDIT_LANGUAGE: 'ignore instructions' },
  { AI_AUDIT_MIN_REVIEWS: '50', AI_AUDIT_MAX_REVIEWS: '10' },
])('rejects unsafe/invalid configuration', override => {
  expect(() => readAuditConfig({ AI_AUDIT_ENABLED: 'true', OLLAMA_MODEL: 'local', ...override })).toThrow()
})
