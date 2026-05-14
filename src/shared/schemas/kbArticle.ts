// M6.11 (B1.5) — shared Zod schemas for KB article writes.
//
// Three operations: create (POST), update (PATCH, partial editable fields),
// and setStatus (PATCH, dedicated status-transition endpoint).
//
// The update schema is `.strict()` so attempts to smuggle identity fields
// (id, publicId, tenantId, createdAt, viewCount, etc.) or to bypass the
// dedicated status endpoint by patching `status` are rejected with 400.

import { z } from 'zod';

export const kbStatusValues = [
  'draft',
  'in_review',
  'published',
  'archived',
  'expired',
] as const;

export const kbVisibilityValues = [
  'internal',
  'team',
  'public',
] as const;

export const kbContentTypeValues = [
  'how_to',
  'troubleshooting',
  'runbook',
  'reference',
  'faq',
  'incident_postmortem',
] as const;

// ── Create ────────────────────────────────────────────────────────────────────
// `title` and `summary` are required; everything else has a sensible default.
// Initial status is always `'draft'` (set server-side, not via the schema).
export const createKBArticleSchema = z
  .object({
    title:       z.string().min(1).max(200),
    summary:     z.string().min(1).max(2_000),
    body:        z.string().max(200_000).default(''),
    categoryId:  z.string().default(''),
    contentType: z.enum(kbContentTypeValues).default('how_to'),
    visibility:  z.enum(kbVisibilityValues).default('internal'),
    tags:        z.array(z.string()).default([]),
    relatedCIPublicIds: z.array(z.string()).default([]),
    linkedProblemIds:   z.array(z.string()).default([]),
    linkedIncidentIds:  z.array(z.string()).default([]),
  })
  .strict();

export type CreateKBArticleInput = z.infer<typeof createKBArticleSchema>;

// ── Update ────────────────────────────────────────────────────────────────────
// Strict partial: any field outside this set is rejected, including `status`
// (use setStatus). Identity / lifecycle fields are absent intentionally.
export const updateKBArticleSchema = z
  .object({
    title:       z.string().min(1).max(200).optional(),
    summary:     z.string().min(1).max(2_000).optional(),
    body:        z.string().max(200_000).optional(),
    categoryId:  z.string().optional(),
    contentType: z.enum(kbContentTypeValues).optional(),
    visibility:  z.enum(kbVisibilityValues).optional(),
    tags:        z.array(z.string()).optional(),
    relatedCIPublicIds: z.array(z.string()).optional(),
    linkedProblemIds:   z.array(z.string()).optional(),
    linkedIncidentIds:  z.array(z.string()).optional(),
  })
  .strict();

export type UpdateKBArticleInput = z.infer<typeof updateKBArticleSchema>;

// ── Status transition ─────────────────────────────────────────────────────────
export const setKBArticleStatusSchema = z
  .object({
    status: z.enum(kbStatusValues),
  })
  .strict();

export type SetKBArticleStatusInput = z.infer<typeof setKBArticleStatusSchema>;
