import type { PresenceStatus } from '../types'

export interface AuditInput {
  name: string
  address: string | null
  phone: string | null
  category: string | null
  rating: number | null
  reviewCount: number | null
  website: string | null
  presence: PresenceStatus
}

export interface PageEvidence {
  id: string
  requestedUrl: string
  url: string
  retrievedAt: string
  statusCode: number | null
  contentType: string
  sha256: string | null
  text: string
  facts: string[]
  truncated: boolean
  error: string | null
}

export interface AuditFinding {
  observation: string
  recommendation: string
  evidenceId: string
  quote: string
}

export interface AuditReport {
  version: 1
  status: 'complete' | 'unverified' | 'failed' | 'skipped'
  mode: 'website' | 'profile'
  model: string
  language: string
  promptProfile?: { id: string; revision: string }
  preparation?: { model: string; status: 'complete' | 'fallback' }
  createdAt: string
  reason: string | null
  verification: { status: 'matched' | 'unverified' | 'not_applicable'; detail: string }
  summary: string
  websiteQuality: number | null
  opportunityScore: number | null
  qualified: boolean
  qualificationReasons: string[]
  findings: AuditFinding[]
  brief: string
  evidence: PageEvidence[]
}

export type AuditLead = (input: AuditInput) => Promise<AuditReport>
