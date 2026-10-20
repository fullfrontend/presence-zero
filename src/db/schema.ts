import type { AuditReport } from '@/core/audit/types'
import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core'

export const scans = sqliteTable('scans', {
  id: text('id').primaryKey(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  location: text('location').notNull(),
  category: text('category').notNull(),
  countryCode: text('country_code').notNull().default('us'),
  provider: text('provider').notNull(),
  providerConfig: text('provider_config'), // JSON, e.g. { csvContent } — never API keys
  status: text('status', { enum: ['running', 'paused', 'done', 'failed'] }).notNull().default('running'),
  phase: text('phase', { enum: ['fetch', 'process', 'retry', 'done'] }).notNull().default('fetch'),
  providerCursor: text('provider_cursor'),
  errorMessage: text('error_message'),
  totalFound: integer('total_found').notNull().default(0),
  totalProcessed: integer('total_processed').notNull().default(0),
  pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
  label: text('label'),
  title: text('title'),
})

export const businesses = sqliteTable('businesses', {
  id: text('id').primaryKey(),
  scanId: text('scan_id').notNull().references(() => scans.id),
  name: text('name').notNull(),
  address: text('address'),
  phone: text('phone'),
  category: text('category'),
  rating: real('rating'),
  reviewCount: integer('review_count'),
  listedWebsite: text('listed_website'),
  facebookUrl: text('facebook_url'),
  sourceUrl: text('source_url'),
  presenceStatus: text('presence_status', { enum: ['not_found', 'none', 'facebook', 'alive', 'dead', 'parked', 'probe_failed'] }),
  probeDetail: text('probe_detail'),
  auditReport: text('audit_report', { mode: 'json' }).$type<AuditReport>(),
  retried: integer('retried', { mode: 'boolean' }).notNull().default(false),
  score: integer('score'),
  leadStatus: text('lead_status', { enum: ['new', 'contacted', 'replied', 'won', 'lost', 'skipped'] }).notNull().default('new'),
  note: text('note'),
  statusUpdatedAt: integer('status_updated_at', { mode: 'timestamp' }),
})

export const domainCandidates = sqliteTable('domain_candidates', {
  id: text('id').primaryKey(),
  businessId: text('business_id').notNull().references(() => businesses.id),
  domain: text('domain').notNull(),
  available: integer('available', { mode: 'boolean' }), // null = RDAP check failed
  checkedAt: integer('checked_at', { mode: 'timestamp' }).notNull(),
})

export const rdapCache = sqliteTable('rdap_cache', {
  domain: text('domain').primaryKey(),
  available: integer('available', { mode: 'boolean' }).notNull(),
  checkedAt: integer('checked_at', { mode: 'timestamp' }).notNull(),
})

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})


export const searchThrottle = sqliteTable('search_throttle', {
  key: text('key').primaryKey(),
  nextAllowedAt: integer('next_allowed_at').notNull().default(0),
  blockedUntil: integer('blocked_until').notNull().default(0),
  leaseUntil: integer('lease_until').notNull().default(0),
  owner: text('owner'),
})


export const scanJobs = sqliteTable('scan_jobs', {
  id: text('id').primaryKey(),
  scanId: text('scan_id').notNull().references(() => scans.id),
  businessId: text('business_id').references(() => businesses.id),
  kind: text('kind', { enum: ['collect', 'search', 'probe', 'domains', 'phone', 'audit'] }).notNull(),
  status: text('status', { enum: ['pending', 'running', 'done', 'failed'] }).notNull().default('pending'),
  attempts: integer('attempts').notNull().default(0),
  availableAt: integer('available_at').notNull().default(0),
  leaseUntil: integer('lease_until').notNull().default(0),
  owner: text('owner'),
  error: text('error'),
  result: text('result'),
}, table => [index('scan_jobs_ready').on(table.kind, table.status, table.availableAt), index('scan_jobs_scan').on(table.scanId)])
