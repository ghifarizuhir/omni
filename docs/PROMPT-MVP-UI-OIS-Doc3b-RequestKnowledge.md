# PROMPT: MVP UI — OIS (Omni Intelligence Suite)
## Doc 3b — Operational Response Cluster: Service Request + Knowledge Management

> **Prerequisite:** Doc 0 + 1 + 2 + 3a sudah di-execute di Build Mode session yang sama.
> **Modules:** Service Request Management (§7.4) + Knowledge Management (§7.12)
> **Routes covered:** `/portal`, `/portal/catalog`, `/portal/catalog/:itemId`, `/portal/my-requests`, `/requests`, `/requests/:id`, `/kb`, `/kb/:slug`, `/kb/editor`, `/kb/editor/:slug`, `/kb/analytics`

---

## 🎯 SCOPE & DEPENDENCIES

Doc 3b melengkapi cluster **Operational Response**. Dua modul ini punya karakter berbeda:

1. **Service Request** — dual-view: end-user self-service portal + agent fulfillment queue
2. **Knowledge Management** — author + consume + measure: editor, browser, analytics

**Reuse from Doc 0 + 1 + 2 + 3a:**
- AppShell, all UI primitives, formatters
- Mock data: users, teams, services, CIs, events, incidents, problems
- Cross-link: KB ↔ incidents (Doc 3a), KB ↔ problems known errors (Doc 3a), Service Request ↔ change (Doc 4 placeholder)

**To be added in Doc 3b:**
- Domain types: `ServiceRequest`, `CatalogItem`, `WorkflowInstance`, `Approval`, `KBArticle`, `KBCategory`, `KBFeedback`
- Mock data: 15 service requests, 12 catalog items (5 categories), 12 KB articles, KB analytics aggregates
- Module components in `src/components/portal/`, `src/components/requests/`, `src/components/kb/`
- 11 route implementations
- Update routing config + cross-link to existing modules

---

## 🧩 DOMAIN TYPES (`src/types/request.ts`)

```typescript
import { GenericStatus } from './common';

// Catalog item categories
export type CatalogCategory =
  | 'access'           // Application access, system permissions, group membership
  | 'equipment'        // Laptop, monitor, peripherals
  | 'software'         // License requests, software install
  | 'communication'    // Phone, mailing list, conference room
  | 'personnel'        // New hire onboarding, role change
  | 'general';         // Misc

// Request status (lifecycle)
export type RequestStatus =
  | 'draft'            // User started but not submitted
  | 'submitted'        // Pending approval
  | 'approved'         // Approved, awaiting fulfillment
  | 'in_fulfillment'   // Being worked on
  | 'pending_user'     // Waiting on requester for info
  | 'fulfilled'        // Done, awaiting close
  | 'closed'           // Verified and closed
  | 'rejected'         // Approval rejected
  | 'cancelled';       // Withdrawn by requester

// Workflow step status
export type WorkflowStepStatus = 'pending' | 'active' | 'completed' | 'skipped' | 'rejected';

// Approval decision
export type ApprovalDecision = 'pending' | 'approved' | 'rejected';

// Form field types for catalog item dynamic forms
export type FieldType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'date'
  | 'user_picker'
  | 'ci_picker'
  | 'file_upload'
  | 'checkbox';

// === CATALOG ITEM (the "what you can request") ===
export interface CatalogItem {
  id: string;
  publicId: string;                      // e.g. "CAT-ACC-001"
  name: string;
  shortDescription: string;              // 1 sentence for list/search
  description: string;                   // Full markdown
  category: CatalogCategory;
  iconName: string;                      // lucide-react icon name
  estimatedFulfillmentDays: number;      // SLA hint
  cost?: { amount: number; currency: string }; // Optional, for hardware
  ownerTeamId: string;                   // Which team fulfills this
  popularity: number;                    // 0-100, drives "Popular" sort

  // Form schema — dynamic fields user fills
  formFields: FormField[];

  // Workflow definition — sequence of steps
  workflowTemplate: WorkflowStepTemplate[];

  // Linked KB articles (helpful context)
  linkedKBSlugs: string[];

  // Tags for search
  tags: string[];

  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  helpText?: string;
  placeholder?: string;
  defaultValue?: string | number | boolean;

  // For select/multiselect
  options?: Array<{ value: string; label: string }>;

  // For number
  min?: number;
  max?: number;

  // For text/textarea
  minLength?: number;
  maxLength?: number;

  // Conditional display
  showWhen?: { fieldId: string; value: string | number | boolean };
}

export interface WorkflowStepTemplate {
  id: string;
  name: string;                          // e.g. "Manager approval"
  type: 'approval' | 'task' | 'automated';
  description?: string;
  // For approval steps
  approverType?: 'user' | 'team' | 'manager_of_requester' | 'service_owner';
  approverId?: string;                   // Specific user/team id when type is fixed
  // For task steps
  assigneeType?: 'team' | 'role';
  assigneeId?: string;
  // SLA in hours
  slaHours: number;
}

// === SERVICE REQUEST (the "actual filed request") ===
export interface ServiceRequest {
  id: string;
  publicId: string;                      // e.g. "REQ-2026-00342"

  catalogItemId: string;
  catalogItemPublicId: string;
  catalogItemName: string;               // Denormalized
  catalogCategory: CatalogCategory;

  title: string;                         // Auto-generated from item + form data
  description?: string;                  // From form short summary

  status: RequestStatus;
  priority: 'low' | 'normal' | 'high';   // Lighter than incident priority

  // Requester
  requesterId: string;
  requesterName: string;
  requesterTeamId?: string;

  // Form values (the data the user submitted)
  formData: Record<string, string | number | boolean | string[]>;

  // Workflow instance (active steps)
  workflow: WorkflowInstance;

  // Approval log (for transparency)
  approvals: Approval[];

  // Assignment to fulfiller (after approvals)
  assigneeId?: string;
  assigneeName?: string;

  // SLA
  totalSlaHours: number;                 // Sum of workflow step SLAs
  slaBreached: boolean;
  estimatedCompletion: string;           // ISO

  // Timestamps
  submittedAt?: string;                  // When moved from draft to submitted
  approvedAt?: string;
  fulfilledAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;

  // Linkage
  linkedChangeId?: string;               // Some requests trigger Standard Changes (Doc 4)
  linkedKBSlugs: string[];

  // Comments (similar to incident comments but lighter)
  commentCount: number;

  tags: string[];
}

export interface WorkflowInstance {
  id: string;
  currentStepIndex: number;              // 0-based, which step is "active"
  steps: WorkflowStepInstance[];
}

export interface WorkflowStepInstance {
  id: string;
  templateId: string;
  name: string;
  type: 'approval' | 'task' | 'automated';
  description?: string;
  status: WorkflowStepStatus;
  startedAt?: string;
  completedAt?: string;
  // For approval/task assignment
  assigneeId?: string;
  assigneeName?: string;
  // For approval decisions (snapshot for display)
  decision?: ApprovalDecision;
  decisionNote?: string;
  decidedAt?: string;
  decidedBy?: string;
  // SLA
  slaHours: number;
  slaStatus: 'healthy' | 'warning' | 'breached';
}

export interface Approval {
  id: string;
  stepId: string;                        // Which workflow step this belongs to
  approverId: string;
  approverName: string;
  decision: ApprovalDecision;
  note?: string;
  decidedAt?: string;
  delegated?: { fromUserId: string; toUserId: string; reason?: string };
}
```

## 🧩 DOMAIN TYPES (`src/types/knowledge.ts`)

```typescript
export type KBStatus =
  | 'draft'
  | 'in_review'
  | 'published'
  | 'archived'
  | 'expired';

export type KBVisibility =
  | 'internal'         // All staff
  | 'team'             // Specific team
  | 'public';          // Customer-facing (future use; v1 internal-only)

export type KBContentType =
  | 'how_to'           // Step-by-step procedure
  | 'troubleshooting'  // Diagnostic flow / decision tree
  | 'runbook'          // Operational runbook
  | 'reference'        // Reference material
  | 'faq'              // Q&A
  | 'incident_postmortem'; // PIR / lessons learned

// === KB CATEGORY (browsing taxonomy) ===
export interface KBCategory {
  id: string;
  slug: string;
  name: string;
  description?: string;
  iconName: string;                      // lucide-react icon
  parentId?: string;                     // For nested categories
  sortOrder: number;
  articleCount: number;                  // Denormalized
}

// === KB ARTICLE ===
export interface KBArticle {
  id: string;
  slug: string;                          // URL-safe, e.g. "payment-api-restart-procedure"
  publicId: string;                      // e.g. "KB-00187"

  title: string;
  summary: string;                       // 1-2 sentence preview, shown in search results
  body: string;                          // Markdown body

  status: KBStatus;
  visibility: KBVisibility;
  contentType: KBContentType;

  // Categorization
  categoryId: string;
  categoryName: string;                  // Denormalized
  tags: string[];

  // Authorship
  authorId: string;
  authorName: string;
  contributorIds: string[];

  // Linkage
  relatedCIIds: string[];                // CIs this article concerns
  relatedCIPublicIds: string[];
  linkedIncidentIds: string[];           // Incidents that reference this
  linkedProblemIds: string[];            // Problems with this as workaround
  relatedArticleSlugs: string[];

  // Engagement
  viewCount: number;
  helpfulCount: number;
  unhelpfulCount: number;
  averageReadTimeSeconds: number;

  // Lifecycle dates
  publishedAt?: string;
  reviewedAt?: string;                   // Last review for accuracy
  reviewDueAt?: string;                  // When next review is needed
  expiresAt?: string;                    // For time-bound articles
  createdAt: string;
  updatedAt: string;

  // Versioning (light — just version count)
  version: number;
  previousVersions?: number;             // count of older versions
}

export interface KBFeedback {
  id: string;
  articleId: string;
  userId: string;
  isHelpful: boolean;
  comment?: string;
  createdAt: string;
}
```

In `src/types/index.ts`:
```typescript
export * from './request';
export * from './knowledge';
```

---

## 🗄 MOCK DATA

### `src/mocks/catalogItems.ts` — 12 items across 5 categories

**Access** (4 items):
1. `CAT-ACC-001` — **Production Database Read Access** — request read-only access to a specific Postgres or MongoDB. Form: dropdown of available DBs, justification textarea, expiration date. Workflow: manager approval → DBA approval → automated grant. ETA: 1 day. ownerTeamId: t-platform.
2. `CAT-ACC-002` — **AWS Console Access** — IAM role provisioning. Form: requested role, AWS account, justification. Workflow: manager → cloud team approval → automated grant. ETA: 2 days.
3. `CAT-ACC-003` — **GitHub Repository Access** — add to repo. Form: repo name, access level (read/write/admin), justification. Workflow: repo owner approval → automated. ETA: same day.
4. `CAT-ACC-004` — **Slack Channel Membership (private)** — join private channel. Form: channel name, reason. Workflow: channel owner approval → automated. ETA: same day.

**Equipment** (3 items):
5. `CAT-EQP-001` — **New Laptop** — request new laptop hardware. Form: model preference (3 options), accessories checklist, location. Workflow: manager approval → IT team task → asset assignment. ETA: 5 days. Cost: USD 1500-3000.
6. `CAT-EQP-002` — **Monitor / Display** — external monitor request. Form: size (24"/27"/32"), location. Workflow: manager → IT team task. ETA: 3 days.
7. `CAT-EQP-003` — **Peripherals (Keyboard/Mouse/Headset)** — small accessories. Form: item type, model preference. Workflow: IT team task. ETA: 2 days.

**Software** (2 items):
8. `CAT-SW-001` — **Software License Request** — IDE/tool license. Form: software name, justification. Workflow: manager → IT procurement → automated. ETA: 5 days.
9. `CAT-SW-002` — **Workstation Software Install** — install software via MDM. Form: software list (multiselect), urgency. Workflow: IT team task. ETA: 1 day.

**Communication** (2 items):
10. `CAT-COM-001` — **Mailing List Membership** — join distribution list. Form: list name, justification. Workflow: list owner approval → automated. ETA: same day.
11. `CAT-COM-002` — **Conference Room Booking (recurring)** — recurring meeting room. Form: room, days/times, end date. Workflow: facilities approval. ETA: same day.

**Personnel** (1 item):
12. `CAT-HR-001` — **New Hire Onboarding Checklist** — bundles many access requests. Form: hire name, role, start date, manager. Workflow: HR approval → IT setup → access grants → confirmation. ETA: 5 days.

For each, populate full FormField list with realistic options and defaults. Showcase item is `CAT-ACC-001` — make its form most complete (used in the multi-step request flow demo).

**Showcase: CAT-ACC-001 form fields:**

```typescript
formFields: [
  {
    id: 'database_target',
    label: 'Which database?',
    type: 'select',
    required: true,
    options: [
      { value: 'CI-DB-PAY-001', label: 'pay-postgres-primary (Payment Service)' },
      { value: 'CI-DB-AUTH-001', label: 'auth-postgres (Auth Service)' },
      { value: 'CI-DB-ORD-001', label: 'order-mongo-primary (Order Service)' },
    ],
    helpText: 'Choose the database you need read access to.',
  },
  {
    id: 'access_duration',
    label: 'Access duration',
    type: 'select',
    required: true,
    options: [
      { value: '7d', label: '7 days' },
      { value: '30d', label: '30 days' },
      { value: '90d', label: '90 days' },
      { value: 'permanent', label: 'Permanent (requires extra approval)' },
    ],
    defaultValue: '30d',
  },
  {
    id: 'justification',
    label: 'Business justification',
    type: 'textarea',
    required: true,
    minLength: 50,
    placeholder: 'Explain why you need this access and what queries you intend to run...',
    helpText: 'Minimum 50 characters. Reviewer will see this verbatim.',
  },
  {
    id: 'related_ticket',
    label: 'Related incident or problem (optional)',
    type: 'text',
    required: false,
    placeholder: 'e.g. INC-2026-00184 or PRB-2026-00018',
    helpText: 'If this access is for resolving an active issue.',
  },
  {
    id: 'data_handling_acknowledged',
    label: 'I acknowledge the data handling policy',
    type: 'checkbox',
    required: true,
    helpText: 'You agree to comply with PCI-DSS and internal data handling rules.',
  },
],

workflowTemplate: [
  { id: 'wf-1', name: 'Manager approval',     type: 'approval', approverType: 'manager_of_requester', slaHours: 8 },
  { id: 'wf-2', name: 'DBA approval',         type: 'approval', approverType: 'team', approverId: 't-platform', slaHours: 16 },
  { id: 'wf-3', name: 'Automated grant',      type: 'automated', slaHours: 1 },
  { id: 'wf-4', name: 'User confirmation',    type: 'task', assigneeType: 'role', assigneeId: 'requester', slaHours: 48 },
],

linkedKBSlugs: ['db-read-access-best-practices', 'pci-dss-data-handling'],
tags: ['production', 'database', 'pci-scope', 'compliance'],
```

### `src/mocks/serviceRequests.ts` — 15 requests

**Distribution:**
- Status mix: draft=1, submitted=3, approved=2, in_fulfillment=2, pending_user=1, fulfilled=2, closed=3, rejected=1
- Mostly catalog items from above
- Spread across last 14 days
- Different requesters (mix of u-002 to u-012)

**Required showcase request:**

```
REQ-2026-00342
  catalogItem: CAT-ACC-001 (Production Database Read Access)
  title: "Production Database Read Access — pay-postgres-primary (30d)"
  status: submitted
  priority: normal
  requesterId: u-011 (Liam O'Connor)
  requesterTeamId: t-product
  formData: {
    database_target: 'CI-DB-PAY-001',
    access_duration: '30d',
    justification: 'Need to query payment_transactions table to investigate user-reported reconciliation issue (case #1247). Will only run SELECT queries with LIMIT clauses.',
    related_ticket: 'INC-2026-00179',
    data_handling_acknowledged: true,
  }
  workflow: {
    currentStepIndex: 0,
    steps: [
      {
        id: 'wfi-1',
        templateId: 'wf-1',
        name: 'Manager approval',
        type: 'approval',
        status: 'active',
        startedAt: 2026-05-08T05:20:00Z,
        assigneeId: 'u-001',  // Sarah Chen as manager
        assigneeName: 'Sarah Chen',
        slaHours: 8,
        slaStatus: 'healthy',
      },
      {
        id: 'wfi-2',
        templateId: 'wf-2',
        name: 'DBA approval',
        type: 'approval',
        status: 'pending',
        slaHours: 16,
        slaStatus: 'healthy',
      },
      {
        id: 'wfi-3',
        templateId: 'wf-3',
        name: 'Automated grant',
        type: 'automated',
        status: 'pending',
        slaHours: 1,
        slaStatus: 'healthy',
      },
      {
        id: 'wfi-4',
        templateId: 'wf-4',
        name: 'User confirmation',
        type: 'task',
        status: 'pending',
        assigneeId: 'u-011',
        assigneeName: "Liam O'Connor",
        slaHours: 48,
        slaStatus: 'healthy',
      },
    ],
  }
  approvals: []  // No decisions yet
  totalSlaHours: 73 (8+16+1+48)
  slaBreached: false
  estimatedCompletion: 2026-05-11T05:20:00Z
  submittedAt: 2026-05-08T05:20:00Z
  createdAt: 2026-05-08T05:18:00Z
  commentCount: 1
  tags: [database, pci-scope, normal]
```

This is the request shown in Doc 0 dashboard inbox `ibx-004`.

**Other notable requests** (generate full data for all 15):
- 2 New Laptop requests (one approved-pending-fulfillment, one fulfilled)
- 2 GitHub access requests (one closed quickly, one rejected with reason)
- 1 New Hire Onboarding (in_fulfillment, multi-step, partially complete)
- 1 Software License (pending_user — waiting on cost center info)
- 1 Slack Channel access (closed within 1h)
- 1 AWS Console (in_fulfillment, 2 of 3 steps done)
- 1 Mailing List (closed)
- 1 Monitor (approved, awaiting delivery)
- 1 Peripherals (closed)
- 1 Conference Room (closed)
- 1 draft (CAT-ACC-002, requester started but didn't submit)

For each request, populate workflow with realistic step states matching status. For closed/fulfilled, all steps `completed`. For pending_user, one step has `pending_user` indicator.

Helpers:
```typescript
export const getRequestById = (id: string) => mockRequests.find(r => r.id === id || r.publicId === id);
export const getRequestsByRequester = (userId: string) => mockRequests.filter(r => r.requesterId === userId);
export const getActiveRequests = () => mockRequests.filter(r => !['closed', 'fulfilled', 'rejected', 'cancelled'].includes(r.status));
export const getMyPendingApprovals = (userId: string) => mockRequests.filter(r =>
  r.workflow.steps.some(s => s.status === 'active' && s.type === 'approval' && s.assigneeId === userId)
);
```

### `src/mocks/kbCategories.ts` — KB taxonomy

```typescript
export const mockKBCategories: KBCategory[] = [
  { slug: 'getting-started',    name: 'Getting Started',    iconName: 'Rocket',     sortOrder: 1, articleCount: 2 },
  { slug: 'runbooks',            name: 'Runbooks',           iconName: 'BookOpen',   sortOrder: 2, articleCount: 4 },
  { slug: 'troubleshooting',     name: 'Troubleshooting',    iconName: 'Wrench',     sortOrder: 3, articleCount: 3 },
  { slug: 'how-to',              name: 'How-To Guides',      iconName: 'ListChecks', sortOrder: 4, articleCount: 2 },
  { slug: 'reference',           name: 'Reference',          iconName: 'FileText',   sortOrder: 5, articleCount: 1 },
  { slug: 'postmortems',         name: 'Postmortems',        iconName: 'Microscope', sortOrder: 6, articleCount: 0 },
];
```

Adjust `articleCount` to match actual counts after KB articles are populated below.

### `src/mocks/kbArticles.ts` — 12 articles

```
KB-00187  payment-api-restart-procedure
  Title: "Runbook: Payment API restart procedure"
  Category: runbooks
  ContentType: runbook
  Status: published
  Author: u-005 (Yuki Tanaka)
  publishedAt: 2026-04-16
  reviewDueAt: 2026-07-16
  Summary: "Step-by-step procedure to safely restart payment-worker pods to release stuck DB connections."
  body: (full markdown — see template below)
  relatedCIPublicIds: [CI-APP-PAY-001, CI-APP-PAY-002]
  linkedProblemIds: [PRB-2026-00018 internal id]
  tags: [payment, restart, runbook, pool-exhaustion, urgent]
  viewCount: 287
  helpfulCount: 24
  unhelpfulCount: 2
  averageReadTimeSeconds: 180

KB-00203  troubleshooting-payment-api-5xx-errors
  Title: "Troubleshooting: Payment API 5xx errors"
  Category: troubleshooting
  ContentType: troubleshooting
  Status: published
  Author: u-004 (David Okafor)
  Summary: "Decision flow for diagnosing 5xx errors on Payment API: pool exhaustion, downstream issues, or app bugs."
  relatedCIPublicIds: [CI-APP-PAY-001, CI-DB-PAY-001]
  linkedIncidentIds: [INC-2026-00184, INC-2026-00156]
  viewCount: 412
  helpfulCount: 38
  unhelpfulCount: 1

KB-00231  es-cluster-yellow-recovery
  Title: "Runbook: ES cluster yellow status recovery"
  Category: runbooks
  Author: u-008 (Aisha Khan)
  publishedAt: 2026-05-08T06:30:00Z (matches Doc 0 notification ntf-006)
  Summary: "How to recover Elasticsearch cluster from yellow to green status during peak load."
  viewCount: 45
  linkedIncidentIds: [INC-2026-00182]

KB-00198  db-read-access-best-practices
  Title: "Best practices for production database read access"
  Category: how-to
  Author: u-001 (Sarah Chen)
  Summary: "Guidelines for safely querying production databases: query patterns, LIMITs, no joins on large tables."
  viewCount: 156
  helpfulCount: 18

KB-00199  pci-dss-data-handling
  Title: "Reference: PCI-DSS data handling rules"
  Category: reference
  ContentType: reference
  Author: u-001 (Sarah Chen)
  Summary: "Compliance summary for handling cardholder data: storage, transmission, retention rules."
  viewCount: 234
  helpfulCount: 12

KB-00156  ssh-access-via-bastion
  Title: "How to: SSH to production servers via bastion"
  Category: how-to
  Status: published
  Summary: "Configure SSH for accessing production hosts through the bastion jump server."
  viewCount: 312
  helpfulCount: 41

KB-00134  oncall-handover-checklist
  Title: "On-call handover checklist"
  Category: runbooks
  Status: published
  Summary: "What to review before handing off the on-call rotation to the next engineer."
  viewCount: 178

KB-00145  troubleshooting-slack-notifications
  Title: "Troubleshooting: Slack notifications not arriving"
  Category: troubleshooting
  Status: published
  Summary: "If alerts/notifications aren't reaching Slack, check these 5 things first."
  viewCount: 89

KB-00120  laptop-onboarding
  Title: "Getting started: New laptop onboarding"
  Category: getting-started
  Status: published
  Summary: "First-day setup instructions for your new company laptop."
  viewCount: 89

KB-00121  ois-platform-overview
  Title: "Getting started: OIS platform overview"
  Category: getting-started
  Status: published
  Summary: "Introduction to the OIS platform for new IT staff."
  viewCount: 142

KB-00210  legacy-runbook-search-cluster
  Title: "[Legacy] Search cluster manual indexing"
  Category: runbooks
  Status: archived (archived 30 days ago)
  Summary: "Old procedure for manual search indexing — superseded by KB-00231."
  viewCount: 12

KB-00248  draft-payment-pgbouncer-migration
  Title: "Runbook: Payment migration to pgbouncer (DRAFT)"
  Category: runbooks
  Status: draft
  Author: u-004 (David Okafor)
  Summary: "Procedure for migrating payment-api from direct DB connections to pgbouncer pooling."
  viewCount: 0
```

**Body example for KB-00187** (showcase article — make this rich):

```markdown
# Runbook: Payment API restart procedure

> **When to use this:** Use when payment-api is returning 5xx errors with stuck DB connection pool.
> Verify with `KB-00203 — Troubleshooting Payment API 5xx errors` first.

## Prerequisites

- Production access to `acme-prod-cluster` (use `KB-00156` for SSH)
- `kubectl` configured for production context
- Acknowledged active incident (if any)

## Procedure

### 1. Verify the issue

Check current pool saturation:

\`\`\`bash
kubectl exec -n payment payment-api-0 -- \
  psql -h pay-postgres-primary -U app -c \
  "SELECT count(*) FROM pg_stat_activity WHERE state='active';"
\`\`\`

Expected: < 18 (out of pool size 20). If > 18, proceed.

### 2. Notify in incident channel

Post in `#incidents`:

> Restarting payment-worker pods to release stuck connections. ETA 2min.

### 3. Rolling restart of payment-worker

\`\`\`bash
kubectl rollout restart -n payment deployment/payment-worker
kubectl rollout status -n payment deployment/payment-worker --timeout=120s
\`\`\`

> **Note:** Do NOT restart payment-api itself unless the issue persists after worker restart.
> Restarting api will cause a brief 503 spike for in-flight requests.

### 4. Verify recovery

Wait 60s after rollout completes, then check:

\`\`\`bash
kubectl exec -n payment payment-api-0 -- \
  curl -s localhost:8080/health
\`\`\`

Pool should be back to ~10 active connections.

## Rollback

If restart did not resolve, escalate to L3 SRE. Do NOT iterate without diagnosis.

## Related

- `KB-00203` — Troubleshooting Payment API 5xx errors
- `PRB-2026-00018` — Recurring memory pressure on payment-api
- `CHG-2026-00091` — Permanent fix: migrate to pgbouncer
```

For other articles, use shorter realistic body content (200-500 words each). Use markdown features: headings, code blocks, callouts (`> **Note:**`), bullet lists, links to other KB by `KB-XXXXX` reference.

### `src/mocks/kbFeedback.ts` — sample feedback

Generate ~30 feedback entries spread across articles:
```typescript
{
  articleId: '<KB-00187 id>',
  userId: 'u-005',
  isHelpful: true,
  comment: 'Saved me during the outage last week.',
  createdAt: '2026-04-22T...',
}
```

Mix positive and negative; for the 2 "unhelpful" votes on KB-00187, include comments like "Procedure didn't work for staging environment — needs update" to drive analytics insight.

### `src/mocks/kbAnalytics.ts` — aggregate analytics data

```typescript
export const kbAnalytics = {
  // 30-day stats
  totalViews: 2178,
  totalSearches: 487,
  uniqueUsersActive: 64,
  helpfulRate: 0.91,    // ratio of helpful votes / total votes

  // Top searched (terms)
  topSearches: [
    { term: 'payment 5xx', count: 73, hasMatchingArticle: true },
    { term: 'pool exhaustion', count: 41, hasMatchingArticle: true },
    { term: 'pgbouncer migration', count: 28, hasMatchingArticle: false }, // gap!
    { term: 'es cluster yellow', count: 24, hasMatchingArticle: true },
    { term: 'sso eu region', count: 21, hasMatchingArticle: false },        // gap!
    { term: 'oncall handover', count: 19, hasMatchingArticle: true },
    { term: 'aws console access', count: 18, hasMatchingArticle: true },
    { term: 'slack notifications', count: 16, hasMatchingArticle: true },
    { term: 'order checkout latency', count: 14, hasMatchingArticle: false }, // gap!
    { term: 'mongo replica lag', count: 12, hasMatchingArticle: false },     // gap!
  ],

  // Top viewed articles
  topViewed: [/* slugs sorted by viewCount, top 10 */],

  // Helpful articles
  topHelpful: [/* slugs sorted by helpful ratio with min 5 votes */],

  // Articles needing review (review overdue)
  needsReview: [/* articles where reviewDueAt < now */],

  // Identified gaps (top searches without matching article)
  contentGaps: [
    { searchTerm: 'pgbouncer migration', count: 28, suggestedAction: 'Create runbook for pgbouncer migration (linked to CHG-2026-00091)' },
    { searchTerm: 'sso eu region', count: 21, suggestedAction: 'Document EU region SSO troubleshooting' },
    { searchTerm: 'order checkout latency', count: 14, suggestedAction: 'Create troubleshooting article (linked to INC-2026-00183)' },
    { searchTerm: 'mongo replica lag', count: 12, suggestedAction: 'Create runbook for MongoDB replica lag investigation' },
  ],

  // Daily view volume for chart (last 30 days)
  viewsTimeSeries: [
    { date: '2026-04-08', views: 64 },
    { date: '2026-04-09', views: 71 },
    // ... 30 entries total
  ],
};
```

---

## 📄 PAGE 3b.1 — Self-Service Portal Home

**File:** `src/routes/portal/PortalHome.tsx`
**Route:** `/portal`

### Purpose
Landing page for end users (Liam-style: a product engineer who needs help). Different vibe from agent UI — friendlier, less dense, more visual.

### Layout: full-width hero + sections

### Hero section

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                            │
│            What can we help you with today, Sarah?                          │
│                                                                            │
│    [🔍 Search the catalog or knowledge base...                       ]      │
│                                                                            │
│    Popular: laptop · github access · vpn · slack channel · password          │
│                                                                            │
└──────────────────────────────────────────────────────────────────────────┘
```

- Light gradient background (subtle, primary tone)
- Large search input centered, max-width 640px
- Personalized greeting using `currentUser.name`
- "Popular" tags below = clickable, prefills search
- Search submission → if matches a catalog item, suggests it; if matches KB, suggests article

### "Quick Actions" cards (4 cards)

```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ 🛒           │ 📋           │ 📚           │ 💬           │
│              │              │              │              │
│ Browse       │ My Requests  │ Knowledge    │ Talk to      │
│ Catalog      │              │ Base         │ Service Desk │
│              │              │              │              │
│ Request      │ Track status │ Find         │ Live chat    │
│ services     │ of your      │ articles &   │ during       │
│ & equipment  │ items        │ runbooks     │ business hrs │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

Each card: large icon, title, description, hover lift. Click navigates:
- Browse Catalog → `/portal/catalog`
- My Requests → `/portal/my-requests`
- Knowledge Base → `/kb`
- Talk to Service Desk → opens placeholder modal "Service desk chat coming soon" (no real chat in MVP)

### "Your activity" section

```
┌─ Your active requests ─────────────────────────[View all →]┐
│ REQ-2026-00342  Production DB Read Access                  │
│ Submitted · Manager approval pending · Started 3h ago      │
│                                                              │
│ REQ-2026-00337  New Monitor                                 │
│ Approved · Awaiting fulfillment · Started 2d ago            │
└──────────────────────────────────────────────────────────────┘

┌─ Articles for you ─────────────────────────────[Browse KB →]┐
│ Recommended based on your role and recent activity:         │
│                                                                │
│ • Runbook: Payment API restart procedure                      │
│ • Best practices for production database read access          │
│ • Troubleshooting: Payment API 5xx errors                     │
└────────────────────────────────────────────────────────────────┘
```

For demo, "Recommended" is hardcoded (top 3 KB articles by viewCount tagged with payment-related; in real product would be ML-driven).

### "Popular catalog items" section

```
┌─ Popular requests ─────────────────────────────────────────┐
│                                                              │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│ │ 💻 Laptop   │ │ 🔑 GitHub   │ │ 🖥 Monitor   │            │
│ │             │ │ Access      │ │             │            │
│ │ 5d delivery │ │ Same day    │ │ 3d delivery │            │
│ │ [Request →] │ │ [Request →] │ │ [Request →] │            │
│ └─────────────┘ └─────────────┘ └─────────────┘            │
│ (3 more)                                                    │
└──────────────────────────────────────────────────────────────┘
```

Top 6 catalog items by `popularity` field. Each card: icon + name + ETA + Request button. Click → catalog item detail.

### Footer

```
Need urgent help? Call the IT Service Desk: ext. 4357 · Email: itservicedesk@acme.io
Hours: Mon–Fri 8am–6pm UTC. After hours: emergency only.
```

---

## 📄 PAGE 3b.2 — Service Catalog (Search-First)

**File:** `src/routes/portal/Catalog.tsx`
**Route:** `/portal/catalog`

### Purpose
Notion-style search-first catalog. Big search bar dominates, results filter live, browse by category as fallback.

### Page header

```
[← Portal]                                                                 

Service Catalog
Request services, equipment, software, and access. 12 items available.
```

### Search bar (hero, centered, large)

```
                ┌──────────────────────────────────────────────────┐
                │ 🔍 Search catalog...                              │
                └──────────────────────────────────────────────────┘
                
                Suggestions: laptop · github · database · vpn · slack
```

Real-time search filters items as user types. Search across name, description, tags, category.

### Recommended items (when no search query)

```
RECOMMENDED FOR YOU
─────────────────────────────────────────────────
┌────────────────────────┐ ┌────────────────────────┐
│ 💻 New Laptop          │ │ 🔑 Production Database │
│                        │ │   Read Access          │
│ Request a new laptop.  │ │                        │
│                        │ │ Time-bound read access │
│ ⏱ ~5 days · USD 1.5k+  │ │ to production DB.      │
│                        │ │ ⏱ ~1 day               │
│         [Request →]    │ │         [Request →]    │
└────────────────────────┘ └────────────────────────┘
(4 more)
```

Top 6 by popularity, in 2-column grid (responsive: 3 columns >1280px).

### Browse by category (when no search)

```
BROWSE BY CATEGORY
─────────────────────────────────────────────────

🔑 Access (4)            💻 Equipment (3)         📦 Software (2)
Production DB · AWS      New Laptop · Monitor    License · Workstation
GitHub · Slack           Peripherals             Software

📞 Communication (2)     👤 Personnel (1)         📋 General (0)
Mailing List · Conf Room New Hire Onboarding     —
```

5-6 category cards (depends on count > 0). Click category → filters catalog by that category, search input still works on top of filter.

### Search results layout

When search query active, switch to result list:

```
12 results for "database access"
                                          [Sort: Most relevant ▾]
─────────────────────────────────────────────────

┌─────────────────────────────────────────────────────────┐
│ 🔑 Production Database Read Access                       │
│ CAT-ACC-001 · Access · ⏱ ~1 day                          │
│                                                            │
│ Request time-bound read-only access to a production       │
│ database (Postgres or MongoDB). Requires manager and      │
│ DBA approval.                                             │
│                                                            │
│ Tags: database · production · pci-scope · compliance      │
│                                                            │
│                                          [Request →]      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 🔐 AWS Console Access                                     │
│ CAT-ACC-002 · Access · ⏱ ~2 days                          │
│ ...                                                        │
└─────────────────────────────────────────────────────────┘
```

Each result is a **detailed card** (not dense table) showing icon, name, ID, category chip, ETA chip, full description, tags, primary CTA `[Request →]`.

Sort options: Most relevant / Most popular / Fastest delivery / Recently added.

### Empty state (search no results)

```
[icon: SearchX]
No catalog items match "xyz"

Try fewer keywords, or [Browse all categories].
Need something not listed? [Contact Service Desk]
```

---

## 📄 PAGE 3b.3 — Catalog Item Detail + Request Form (multi-step)

**File:** `src/routes/portal/CatalogItemDetail.tsx`
**Route:** `/portal/catalog/:itemId`

### Purpose
Show item info + multi-step request form: **Step 1 Item info → Step 2 Form → Step 3 Review → Submit**.

### Top header

```
[← Catalog]                                                                
─────────────────────────────────────────────────────────────────────────

[🔑 large icon]  Production Database Read Access
                 CAT-ACC-001 · Access category · ⏱ Estimated 1 day · No cost
```

### Stepper navigation (sticky)

```
●━━━━━━━━━━○━━━━━━━━━━○━━━━━━━━━━○
Item info     Form        Review     Submit
```

Each step is a circle with number/check; line between. Active step highlighted.

### Step 1 — Item info (default landing)

Two-column layout:

**Left (60%) — Item description:**

```
ABOUT THIS REQUEST

[Markdown rendered description]

Use this to request time-bound read-only access to a production database
(Postgres or MongoDB). Access is granted via temporary IAM role.

WHO CAN REQUEST
Anyone with engineering or analyst role.

WHAT TO EXPECT
- Manager approval (typically same day)
- DBA approval (within 1 business day)
- Automated grant (within 1 hour after approvals)
- You'll receive credentials via 1Password

HELPFUL ARTICLES
📚 Best practices for production database read access (KB-00198)
📚 PCI-DSS data handling rules (KB-00199)

────────────────────────────────────────────
[Continue →]
```

**Right (40%) — Workflow preview + meta:**

```
┌─ What happens next ─────────────────┐
│ ●  Manager approval        ~8h SLA  │
│ ●  DBA approval            ~16h SLA │
│ ●  Automated grant         ~1h SLA  │
│ ●  User confirmation       ~48h     │
│ ─────                                │
│ Total estimated: ~3 days             │
└──────────────────────────────────────┘

┌─ Owned by ──────────────────────────┐
│ Platform Engineering                  │
│ team · 4 members                      │
└──────────────────────────────────────┘

┌─ Recently fulfilled ────────────────┐
│ 4 similar requests in last 30 days  │
│ Average actual time: 1.2 days        │
└──────────────────────────────────────┘
```

`[Continue →]` advances to step 2.

### Step 2 — Form

Render form fields from catalog item's `formFields`. Layout: single column, max-width 640px, centered.

```
TELL US WHAT YOU NEED

Which database? *
[Select... ▾]
└ pay-postgres-primary (Payment Service)
  auth-postgres (Auth Service)
  order-mongo-primary (Order Service)
Choose the database you need read access to.

Access duration *
[30 days ▾]

Business justification *
┌────────────────────────────────────────────────────────────┐
│ Need to query payment_transactions table to investigate    │
│ user-reported reconciliation issue (case #1247)...         │
│                                                              │
└────────────────────────────────────────────────────────────┘
85 / 50 minimum  ✓
Reviewer will see this verbatim.

Related incident or problem (optional)
[INC-2026-00179                                              ]

[✓] I acknowledge the data handling policy *
You agree to comply with PCI-DSS and internal data handling rules.

────────────────────────────────────────────
[← Back]                              [Review →]
```

- All fields rendered with labels, required asterisks, help text
- Live validation (required checks, length checks)
- Conditional fields: show/hide based on `showWhen` rules
- "Review →" only enabled when all required valid

For long fields, character counter (e.g. textarea with `minLength: 50` shows `85 / 50 minimum  ✓`).

### Step 3 — Review

```
REVIEW YOUR REQUEST

You're about to request:
─────────────────────────────────────────────────
Production Database Read Access (CAT-ACC-001)

Form responses:
  Which database?         pay-postgres-primary
  Access duration         30 days
  Business justification  Need to query payment_transactions...
                          [show full]
  Related incident        INC-2026-00179
  Policy acknowledged     ✓

Workflow:
  1. Manager approval            → Sarah Chen
  2. DBA approval                → Platform team
  3. Automated grant
  4. User confirmation

Estimated completion: in ~3 days (May 11)
You'll receive email and in-app updates.

────────────────────────────────────────────
[← Edit form]                       [Submit request]
```

`[Edit form]` returns to step 2 with values preserved.
`[Submit request]` submits → success state.

### Success state

```
                       ✓ Request submitted!
                  
                  REQ-2026-00343
                  
            Production Database Read Access
            Awaiting manager approval (Sarah Chen)
            Estimated completion: May 11, 2026

                  [Track status →]   [Submit another]
```

After 2 seconds, auto-navigate to `/portal/my-requests` (or user clicks Track).

### Form state preservation

If user navigates away mid-form, prompt: "Save as draft?" → adds to draft list. (For MVP, just keep state in component memory; no real backend save.)

---

## 📄 PAGE 3b.4 — My Requests (User View)

**File:** `src/routes/portal/MyRequests.tsx`
**Route:** `/portal/my-requests`

### Purpose
End user view of their own request history. Lighter than agent queue.

### Page header

```
My Requests
2 active · 5 completed in last 30 days
                                                    [+ New request]
```

### Filter tabs

```
[All (8)] [Active (2)] [Completed (5)] [Drafts (1)]
```

### Request cards (vertical list)

Each request as a card (more visual than dense table):

```
┌──────────────────────────────────────────────────────────────────────┐
│ ● Submitted                                              REQ-2026-00342│
│                                                                        │
│ Production DB Read Access — pay-postgres-primary                      │
│ 🔑 Access · 3h ago                                                    │
│                                                                        │
│ Workflow:                                                             │
│ ●━━━━━━━━━━━━━○━━━━━━━━━━━○━━━━━━━━━━━○                              │
│ Manager       DBA           Auto grant   You confirm                  │
│ approval      approval                                                 │
│ active        pending       pending      pending                       │
│                                                                        │
│ Manager (Sarah Chen) approving · Started 3h ago · Est. May 11         │
│                                                                        │
│                                            [View details →]            │
└────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│ ● Approved · Awaiting fulfillment                       REQ-2026-00337│
│                                                                        │
│ New Monitor — 27" 4K                                                  │
│ 💻 Equipment · 2d ago · Est. May 11                                   │
│                                                                        │
│ Workflow:                                                             │
│ ●━━━━━━━━━━━━━●━━━━━━━━━━━○                                          │
│ Manager       IT Team       Asset                                     │
│ approval      task          assignment                                │
│ ✓ done        active        pending                                   │
│                                                                        │
│ IT team is preparing your monitor                                     │
│                                                                        │
│                                            [View details →]            │
└────────────────────────────────────────────────────────────────────────┘
```

Each card shows compact stepper visualization right in the card. Status colors:
- Completed step: green filled circle ●
- Active step: primary color filled circle ●
- Pending step: gray hollow circle ○
- Rejected step: red filled with X
- Skipped step: gray strikethrough

Empty state for tabs:
- No active: "No active requests. [+ Browse catalog]"
- No completed: "No completed requests yet."
- No drafts: "No saved drafts."

---

## 📄 PAGE 3b.5 — Agent Request Queue

**File:** `src/routes/requests/RequestQueue.tsx`
**Route:** `/requests`

### Purpose
Agent view (L1/L2 fulfillment perspective). Dense, queue-style. Counterpoint to friendly portal.

### Page header

```
Service Requests
15 total · 8 active · 3 awaiting your approval · 1 SLA breached
                            [Saved views ▾]   [+ New request]
```

### Filter bar

```
[🔍 Search...] [Status ▾] [Category ▾] [Assignee ▾] [Step type ▾] [SLA ▾]   [Reset]
```

### Quick filter chips

```
[🔥 Awaiting my approval (3)] [⚠ SLA at risk (1)] [📋 My team (5)] [📡 Last 24h (4)]
```

### Request table (DataTable)

Columns: `Public ID | Title | Status | Requester | Current step | Assigned to | Submitted | SLA | Actions`

- Public ID: mono
- Title: truncate
- Status: status pill
- Requester: avatar + name
- Current step: shows step name + active dot ("● Manager approval (Sarah)")
- Assigned to: current step's assignee
- Submitted: relative time
- SLA: dot + remaining (e.g. "● 5h 23m left")
- Actions: `⋮` — Open, Approve (if approval pending and current user is approver), Assign, Reject, Cancel

Default sort by submittedAt desc. If user has pending approvals on multiple, sort those to top.

### Empty state

If queue empty: icon CheckCircle2, "All clear. No active requests."

---

## 📄 PAGE 3b.6 — Request Detail (Linear Stepper)

**File:** `src/routes/requests/RequestDetail.tsx`
**Route:** `/requests/:requestId`

### Layout: top header + linear stepper + main + sidebar

### Top bar

```
[← Queue]                                                  [⋮ Actions]
─────────────────────────────────────────────────────────────────────────
[Submitted ▾]
REQ-2026-00342  Production Database Read Access — pay-postgres-primary

  [normal]  [database]  [pci-scope]  [compliance]

  Submitted 3h ago by Liam O'Connor (Product team)
  Catalog item: CAT-ACC-001
```

### Workflow stepper (prominent, full width below header)

This is the **dramatic visualization** chosen for Doc 3b. Linear, horizontal, with clear states:

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│   ●━━━━━━━━━━━━━━━━━━━━━━━○━━━━━━━━━━━━━━○━━━━━━━━━━━━━━○             │
│   ✓                                                                      │
│   Manager       DBA          Automated     User                         │
│   approval      approval     grant         confirms                     │
│   ────          ────          ────          ────                          │
│   active        pending       pending       pending                       │
│   3h ago        —             —             —                             │
│   Sarah Chen    Platform                                                 │
│   ⏱ 5h left     team                                                     │
│                                                                          │
└────────────────────────────────────────────────────────────────────────┘
```

Each node is large (~80px) circle showing:
- **Completed**: solid green circle with white check, line after = solid green
- **Active**: solid primary blue with pulsing animation, line before solid green
- **Pending**: hollow gray circle, line gray dashed
- **Rejected**: red filled with X, halts the flow visually
- **Skipped**: muted gray with strikethrough name

Below each node, label + status + assignee + SLA indicator.

For approval steps where current user is approver, show inline action:
```
[✓ Approve] [✗ Reject with reason]
```

This appears right below the active step's node.

### Approval action modal

Click `[✓ Approve]` → modal:
```
Approve REQ-2026-00342                                            [×]

Manager approval

  Add a note (optional)
  [Looks good. Approving for 30-day window.                       ]

  [✓] Approve and continue to next step
                                              [Cancel] [Approve]
```

Click `[✗ Reject]` → modal requires reason (textarea, required min 20 chars). After reject, workflow halts; subsequent steps marked "skipped".

### Center main column (60%)

Tabs:
```
[Overview] [Form responses] [Activity] [Comments (1)] [Linked items]
```

#### Tab: Overview

```
┌─ Description ─────────────────────────────────────────────────────────┐
│ Request for time-bound read access to pay-postgres-primary for         │
│ investigating reconciliation issue.                                    │
└────────────────────────────────────────────────────────────────────────┘

┌─ Form responses (summary) ────────────────────────────────────────────┐
│ Database:        pay-postgres-primary                                   │
│ Duration:        30 days                                                │
│ Justification:   "Need to query payment_transactions table..."  [more] │
│ Related ticket:  INC-2026-00179 →                                       │
│                                                       [View full form] │
└────────────────────────────────────────────────────────────────────────┘

┌─ Linked items ────────────────────────────────────────────────────────┐
│ Catalog item:   CAT-ACC-001 →                                           │
│ Related ticket: INC-2026-00179 →                                        │
│ KB articles:    KB-00198 (Best practices) · KB-00199 (PCI-DSS)         │
└────────────────────────────────────────────────────────────────────────┘
```

#### Tab: Form responses

Full read-only form view. Same fields/values as submitted. No edit capability for agent (but agent can request changes via "Request info" action that moves status to pending_user).

#### Tab: Activity

Simple timeline (similar to incident timeline but lighter):
```
●  3h ago · Submitted by Liam O'Connor
●  3h ago · Auto-routed to Manager: Sarah Chen
●  2h ago · Comment by Liam: "Adding context: this is for the case #1247 reconciliation."
●  Now   · Awaiting Sarah Chen's decision
```

#### Tab: Comments (1)

Same comment threading as incident detail. Reuse `IncidentCommentThread` component (rename to `CommentThread` if generic).

#### Tab: Linked items

Catalog item, related incident, KB articles, linked change (if any) listed with cards.

### Left sidebar (sticky, 280px)

```
┌─ At a glance ─────────────┐
│ Status     ● Submitted    │
│ Priority   normal         │
│ Submitted  3h ago         │
│ Requester  Liam O'Connor  │
│ Catalog    CAT-ACC-001    │
│ Category   Access         │
└────────────────────────────┘

┌─ SLA timer ───────────────┐
│ Total: 73h target          │
│ Elapsed: 3h                │
│ ████░░░░░░░░░░ 4%          │
│                            │
│ Current step:              │
│ Manager approval           │
│ ⏱ 5h 12m remaining          │
└────────────────────────────┘

┌─ Linked CIs ──────────────┐
│ CI-DB-PAY-001 →           │
│   pay-postgres-primary    │
└────────────────────────────┘
```

### Right sidebar (sticky, 280px)

```
┌─ Quick actions ────────────┐
│ [✓ Approve]                │
│ [✗ Reject]                 │
│ [Request info from user]   │
│ [Reassign current step]    │
│ [Add comment]              │
│ [Cancel request]           │
└────────────────────────────┘

┌─ Watchers (2) ─────────────┐
│ [LO] Liam O'Connor (req.)  │
│ [SC] Sarah Chen            │
│ [+ Add watcher]            │
└────────────────────────────┘
```

`[Approve]` and `[Reject]` only enabled if current user is current step's approver.

---

## 📄 PAGE 3b.7 — Knowledge Base Browser

**File:** `src/routes/kb/KBBrowse.tsx`
**Route:** `/kb`

### Purpose
Browse + search KB. For both agents and end users.

### Page header

```
Knowledge Base
12 articles across 6 categories
                              [+ New article]   [Analytics →]
```

### Search bar (prominent)

```
[🔍 Search articles, runbooks, troubleshooting guides...]
```

Real-time filter as user types. Fuzzy match across title, summary, tags, body.

### Category sidebar (left, 240px)

Below the search:

```
┌─ Categories ───────────────┐
│ All articles (12)          │
│ ────                        │
│ 🚀 Getting Started (2)     │
│ 📖 Runbooks (4)            │
│ 🔧 Troubleshooting (3)     │
│ ✓ How-To Guides (2)        │
│ 📄 Reference (1)           │
│ 🔬 Postmortems (0)         │
│ ────                        │
│ STATUS                      │
│ ☐ Published (10)           │
│ ☐ Draft (1)                │
│ ☐ In Review (0)            │
│ ☐ Archived (1)             │
│ ────                        │
│ TAGS                        │
│ payment (3) auth (1)        │
│ runbook (4) ...             │
└────────────────────────────┘
```

### Main area

When no search active:

```
RECENTLY VIEWED                                          [Sort: Most recent ▾]
─────────────────────────────────────────────────

┌────────────────────────────────────────────────────────────────────┐
│ 📖 Runbook: Payment API restart procedure         KB-00187          │
│ Yuki Tanaka · Updated 22 days ago · 287 views · 92% helpful        │
│                                                                       │
│ Step-by-step procedure to safely restart payment-worker pods to      │
│ release stuck DB connections.                                         │
│                                                                       │
│ Tags: payment · restart · runbook · pool-exhaustion                  │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ 🔧 Troubleshooting: Payment API 5xx errors        KB-00203          │
│ ...                                                                    │
└────────────────────────────────────────────────────────────────────────┘
```

Each article card:
- Content type icon + title (linked) + public ID (mono)
- Author + last updated + view count + helpful percentage
- Summary (max 2 lines, truncate)
- Tags as pills
- Hover: subtle elevation
- Click → `/kb/{slug}`

### Sort options

- Most recent (by updatedAt)
- Most viewed
- Most helpful (helpful ratio, min 5 votes)
- Alphabetical

### Search results

When search query active, show matched articles with **highlighted match snippets**:

```
4 results for "payment 5xx"
─────────────────────────────────────────────────

┌────────────────────────────────────────────────────────────────────┐
│ 🔧 Troubleshooting: Payment API 5xx errors        KB-00203          │
│ Match in title and body                                              │
│                                                                       │
│ "...decision flow for diagnosing 5xx errors on **Payment** API:      │
│ pool exhaustion, downstream issues..."                                │
│                                                                       │
│ 412 views · 97% helpful                                               │
└────────────────────────────────────────────────────────────────────────┘

(more results...)
```

Show match snippets with bolded keyword.

If no results: empty state with `[Suggest article]` button (links to `/kb/editor` with title prefilled).

---

## 📄 PAGE 3b.8 — Article View

**File:** `src/routes/kb/ArticleView.tsx`
**Route:** `/kb/:slug`

### Purpose
Read an article. Polished, distraction-free.

### Top bar (sticky, minimal)

```
[← KB]   📖 Runbook · KB-00187            [Edit] [Share] [⋮]
```

### Article body — centered, max-width 720px

```
                  Runbook: Payment API restart procedure
                  
            By Yuki Tanaka · Last updated April 16, 2026
                  Reviewed: April 16 · Next review: July 16
                  
                  287 views · 24 helpful · 2 unhelpful

        Tags: payment · restart · runbook · pool-exhaustion · urgent

────────────────────────────────────────────────────────────────────────

> **When to use this:** Use when payment-api is returning 5xx errors with stuck
> DB connection pool. Verify with KB-00203 — Troubleshooting Payment API 5xx
> errors first.

## Prerequisites

- Production access to acme-prod-cluster (use KB-00156 for SSH)
- kubectl configured for production context
- Acknowledged active incident (if any)

## Procedure

### 1. Verify the issue

Check current pool saturation:

[CODE BLOCK with syntax highlighting]
kubectl exec -n payment payment-api-0 -- \
  psql -h pay-postgres-primary -U app -c \
  "SELECT count(*) FROM pg_stat_activity WHERE state='active';"

Expected: < 18 (out of pool size 20). If > 18, proceed.

[... rest of body ...]
```

Markdown rendered with:
- Headings as anchors (linked)
- Code blocks with syntax highlighting (use `react-syntax-highlighter` or simple `<pre><code>`)
- Callouts (blockquote with `> **Note:**`) styled with colored left border
- Inline KB references (`KB-XXXXX`) become hyperlinks to `/kb/{slug-of-that-article}`
- Inline incident/problem/change refs (`INC-...`, `PRB-...`, `CHG-...`) become hyperlinks

### Right rail (sticky, 240px)

Article meta + actions:

```
┌─ Was this helpful? ────┐
│  [👍 Yes]    [👎 No]   │
│  92% found this helpful │
│  (24 of 26 votes)       │
└─────────────────────────┘

┌─ Related articles ─────┐
│ KB-00203               │
│ Troubleshooting:       │
│ Payment API 5xx errors │
│                         │
│ KB-00198               │
│ DB read access best    │
│ practices              │
│                         │
│ KB-00231               │
│ ES cluster yellow      │
│ recovery               │
└─────────────────────────┘

┌─ References ───────────┐
│ Linked CIs:            │
│ • CI-APP-PAY-001       │
│ • CI-APP-PAY-002       │
│                         │
│ Linked problem:        │
│ • PRB-2026-00018       │
└─────────────────────────┘

┌─ Article details ──────┐
│ Author     Yuki T.     │
│ Created    Apr 15      │
│ Updated    Apr 16      │
│ Version    3           │
│ Status     Published   │
└─────────────────────────┘

┌─ Table of contents ────┐
│ • Prerequisites        │
│ • Procedure            │
│   • Verify the issue   │
│   • Notify             │
│   • Rolling restart    │
│   • Verify recovery    │
│ • Rollback             │
│ • Related              │
└─────────────────────────┘
```

ToC auto-generated from headings, scroll-spy highlights current section.

### Helpful feedback flow

Click `[👍]` → optimistic UI update + small toast "Thanks!".
Click `[👎]` → modal: "What could be improved? (optional)" textarea + submit. Modal also offers `[Suggest edit]` link to editor with `?source=feedback` query param.

### Top action menu (`⋮`)

- Subscribe to updates
- Report inaccuracy
- Suggest related article
- View edit history
- Print

### Edit button (top-right)

Visible only for users with edit permission (in MVP, always visible). Click → `/kb/editor/{slug}` (edit existing).

### Archived/draft article warning

If status is `archived`:
```
⚠ ARCHIVED — This article is no longer current. See [KB-XXXXX] for the
current version.
```

If status is `draft`:
```
⚠ DRAFT — This article has not been published yet. Visible to authors and reviewers only.
```

---

## 📄 PAGE 3b.9 — KB Editor (Markdown + Slash Commands)

**File:** `src/routes/kb/KBEditor.tsx`
**Routes:** `/kb/editor` (new) and `/kb/editor/:slug` (edit existing)

### Purpose
Author/edit article with **markdown + slash commands** for power users.

### Top bar

```
[← KB]                                          [Save draft] [Preview] [Publish ▾]
─────────────────────────────────────────────────────────────────────────
TITLE
[                                                                          ]
e.g. "Runbook: Payment API restart procedure"

CATEGORY                  CONTENT TYPE              VISIBILITY
[Runbooks ▾]              [Runbook ▾]               [Internal ▾]

TAGS
[payment ×] [runbook ×] [+ Add tag]

LINKED CIs (optional)            LINKED PROBLEMS/INCIDENTS
[+ Link CI]                       [+ Link incident or problem]
[CI-APP-PAY-001 ×]                [PRB-2026-00018 ×]

SUMMARY (1-2 sentences for search results) *
[                                                                          ]
```

### Main editor area

Two-column when wide enough; stacked on smaller. Left: markdown editor; right: live preview.

```
┌─ Markdown ──────────────────┬─ Preview ────────────────────┐
│ # Runbook: Payment API rest..│  Runbook: Payment API restart│
│                              │  procedure                    │
│ > **When to use this:**...   │                               │
│                              │  > [callout style block]      │
│ ## Prerequisites             │  When to use this: ...        │
│                              │                               │
│ - Production access...       │  Prerequisites                │
│ - kubectl configured...      │  • Production access...       │
│                              │  • kubectl configured...      │
│ ## Procedure                 │                               │
│ ...                          │  Procedure                    │
└──────────────────────────────┴───────────────────────────────┘
```

Editor: monospaced textarea with markdown syntax highlighting (use a library like `@uiw/react-md-editor` or just monospace with simple highlighting via regex).

### Slash commands

Typing `/` at the start of a new line opens a command palette:

```
/heading       Insert heading (H1-H6)
/code          Insert code block
/callout       Insert callout (tip / warning / info)
/list          Insert bulleted list
/ordered       Insert numbered list
/link-kb       Link to another KB article
/link-ci       Link to a CI
/link-incident Link to an incident
/divider       Insert horizontal rule
/table         Insert table template
```

Selecting a command inserts the corresponding markdown snippet. For `/link-kb`, opens a sub-modal to search/pick article. For `/link-ci`, opens CI picker.

### Toolbar (above editor)

Above the markdown column, a thin toolbar:
```
[B] [I] [code] [link] [list] [olist] [quote] [code-block] [/]
                                                          slash help
```

Click any → wraps selected text or inserts at cursor.

### Footer / status

```
1,234 words · 5 min read · Auto-saved 12s ago
```

Auto-save fires every 10s (debounced) — for MVP just shows the indicator without real backend.

### Publish flow

`[Publish ▾]` is a split button:
- "Publish now" → status = published, publishedAt = now
- "Submit for review" → status = in_review (assigns to category owner)
- "Save as draft" → status = draft

Confirmation modal asks: "Set review reminder?" → choices 30/60/90/180 days.

### New article (from `/kb/editor`)

Empty state with placeholder:
- Title: empty
- Body: empty with placeholder "# Article title\n\nStart writing..."
- Default: status=draft, visibility=internal, contentType=how_to

### Edit existing (from `/kb/editor/:slug`)

Pre-populated with article data. Title shows "Editing: KB-00187". Top bar shows version badge "v3 (editing)".

---

## 📄 PAGE 3b.10 — KB Analytics

**File:** `src/routes/kb/KBAnalytics.tsx`
**Route:** `/kb/analytics`

### Purpose
Insights-prominent analytics view (per Q4 decision). Highlight gaps and successes.

### Page header

```
Knowledge Base Analytics
Last 30 days · 12 articles · 2,178 views · 91% helpful rate
                                                  [Last 30d ▾]  [⤓ Export]
```

### Top KPI row (4 cards)

```
┌─────────────────┬──────────────────┬──────────────────┬────────────────────┐
│ Total views     │ Searches         │ Helpful rate     │ Active authors     │
│   2,178         │    487           │    91%           │      6             │
│ ▲ +18% prev 30d │ ▲ +12% prev      │ ↔ same           │ ▲ +1 prev          │
└─────────────────┴──────────────────┴──────────────────┴────────────────────┘
```

### Hero section — Content gaps (PROMINENT)

Per Q4 decision, this is the standout section. Use `--ois-warning-pale` background:

```
┌──────────────────────────────────────────────────────────────────────────┐
│  💡 4 content gaps detected                                                │
│                                                                            │
│  Top searches without matching articles:                                   │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │ "pgbouncer migration"                              28 searches  │     │
│  │ Suggested: Create runbook for pgbouncer migration                │     │
│  │ Linked: CHG-2026-00091 (permanent fix in progress)               │     │
│  │                                       [Create article →]          │     │
│  └─────────────────────────────────────────────────────────────────┘     │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │ "sso eu region"                                    21 searches  │     │
│  │ Suggested: Document EU region SSO troubleshooting                │     │
│  │                                       [Create article →]          │     │
│  └─────────────────────────────────────────────────────────────────┘     │
│                                                                            │
│  (2 more gaps)                                                             │
│                                                                            │
│  [+ Bulk create suggested articles]                                        │
└──────────────────────────────────────────────────────────────────────────┘
```

Each gap card shows:
- Search term in quotes (mono)
- Search count (last 30d)
- Suggested action with optional cross-link to incident/change/problem
- `[Create article →]` opens KB editor with title pre-filled and search context preserved

### Two-column lower section

**Left: Top viewed articles**

```
┌─ Top viewed (last 30d) ──────────────────────────────────────────────┐
│ Rank  Article                                  Views  Trend           │
│  1    Troubleshooting: Payment API 5xx          412   ▲ +28%          │
│  2    SSH access via bastion                    312   ↔                │
│  3    Runbook: Payment API restart              287   ▲ +12%          │
│  4    PCI-DSS data handling                     234   ▼ -5%           │
│  5    On-call handover checklist                178   ▲ +8%           │
│  6    DB read access best practices             156   ▲ +44%          │
│  7    OIS platform overview                     142   ↔                │
│  8    Troubleshooting Slack notifications         89   ↔                │
│  9    Laptop onboarding                           89   ↔                │
│ 10    ES cluster yellow recovery                  45   ▲ NEW           │
└────────────────────────────────────────────────────────────────────────┘
```

**Right: Most helpful articles**

```
┌─ Most helpful (min 5 votes) ─────────────────────────────────────────┐
│ Article                                       Helpful  Total          │
│ Troubleshooting: Payment API 5xx              97%      38             │
│ Runbook: Payment API restart                  92%      26             │
│ DB read access best practices                 100%     18             │
│ PCI-DSS data handling                         92%      12             │
│ On-call handover checklist                    100%     8              │
└────────────────────────────────────────────────────────────────────────┘
```

### Lower section — Top searches

```
┌─ Top search terms ──────────────────────────────────────────────────────┐
│ Term                          Count   Has matching article?              │
│ payment 5xx                    73    ✓ Yes (KB-00203)                   │
│ pool exhaustion                41    ✓ Yes (KB-00203, KB-00187)         │
│ pgbouncer migration            28    ⚠ No — CONTENT GAP                  │
│ es cluster yellow              24    ✓ Yes (KB-00231)                   │
│ sso eu region                  21    ⚠ No — CONTENT GAP                  │
│ oncall handover                19    ✓ Yes (KB-00134)                   │
│ aws console access             18    ✓ Yes (KB-00198)                   │
│ slack notifications            16    ✓ Yes (KB-00145)                   │
│ order checkout latency         14    ⚠ No — CONTENT GAP                  │
│ mongo replica lag              12    ⚠ No — CONTENT GAP                  │
└──────────────────────────────────────────────────────────────────────────┘
```

Gap rows highlighted with amber background.

### Lower section — Articles needing review

```
┌─ Reviews overdue or upcoming ───────────────────────────────────────────┐
│ Article                                Status         Next review        │
│ ES cluster yellow recovery             ⏰ Due 3 days   May 11             │
│ DB read access best practices          ⏰ Due 7 days   May 15             │
│ Laptop onboarding                      ✓ Recent       Aug 10              │
│ ...                                                                        │
└──────────────────────────────────────────────────────────────────────────┘
```

### Lower section — Views over time chart

```
┌─ Views over time (last 30 days) ────────────────────────────────────────┐
│                                                                            │
│   100 │                              ╱╲                                    │
│       │                          ╱──╯  ╲   ╱──                            │
│    50 │     ╱╲       ╱──╲    ╱──╯       ╲─╯                              │
│       │ ╱──╯  ╲──╱──╯    ╲──╯                                            │
│     0 └────────────────────────────────────────────────                  │
│       Apr 8  Apr 15  Apr 22  Apr 29  May 6                               │
└────────────────────────────────────────────────────────────────────────────┘
```

Simple SVG line chart from `viewsTimeSeries` mock data.

---

## 🎨 SHARED COMPONENTS

### `src/components/portal/`

```
components/portal/
├── PortalSearch.tsx               # Big hero search input
├── QuickActionCard.tsx            # Big card for "Browse Catalog" etc.
├── CatalogItemCard.tsx            # Item card in catalog list
├── CategoryTile.tsx               # Category browse tile
├── RequestStatusCard.tsx          # User-facing request card with stepper
├── MiniStepper.tsx                # Compact stepper for cards
└── CatalogRequestFlow/
    ├── CatalogRequestFlow.tsx     # Multi-step orchestrator
    ├── StepIndicator.tsx          # Stepper nav
    ├── ItemInfoStep.tsx
    ├── FormStep.tsx
    ├── DynamicFormField.tsx       # Renders any FormField
    ├── ReviewStep.tsx
    └── SuccessStep.tsx
```

### `src/components/requests/`

```
components/requests/
├── RequestRow.tsx                 # DataTable row for agent queue
├── RequestStatusPill.tsx
├── WorkflowStepper.tsx            # Big horizontal stepper for detail page
├── WorkflowNode.tsx               # Single circle node
├── ApprovalActionPanel.tsx        # Inline approve/reject below active step
├── ApproveModal.tsx
├── RejectModal.tsx
├── RequestSidebarSLA.tsx
└── RequestActions.tsx             # Right sidebar action group
```

### `src/components/kb/`

```
components/kb/
├── ArticleCard.tsx                # Search result / list item
├── KBStatusPill.tsx
├── KBContentTypeIcon.tsx
├── HelpfulFeedback.tsx            # Yes/No buttons with optimistic update
├── KBSidebar.tsx                  # Category nav + filters
├── ArticleTOC.tsx                 # Auto-generated table of contents
├── MarkdownRenderer.tsx           # Renders markdown with custom KB-link/CI-link substitutions
├── KBEditor/
│   ├── KBEditor.tsx               # Main editor orchestrator
│   ├── EditorToolbar.tsx
│   ├── SlashCommandMenu.tsx       # The /command palette
│   ├── MarkdownTextarea.tsx       # Mono textarea with light highlighting
│   ├── MarkdownPreview.tsx
│   ├── MetadataForm.tsx           # Title, category, tags, etc.
│   └── PublishMenu.tsx            # Split button for publish/draft/review
└── analytics/
    ├── ContentGapsCard.tsx        # The hero gap section
    ├── TopViewedTable.tsx
    ├── TopHelpfulTable.tsx
    ├── TopSearchesTable.tsx       # With gap highlighting
    ├── ReviewDueTable.tsx
    └── ViewsTimeChart.tsx
```

### Constants in `src/lib/constants.ts`

```typescript
export const requestStatusMeta: Record<RequestStatus, { label: string; color: string; bg: string; dot: string }> = {
  draft:           { label: 'Draft',           color: '#475467', bg: '#F1F3F7', dot: '#98A2B3' },
  submitted:       { label: 'Submitted',       color: '#0BA5EC', bg: '#F0F9FF', dot: '#0BA5EC' },
  approved:        { label: 'Approved',        color: '#067647', bg: '#ECFDF3', dot: '#12B76A' },
  in_fulfillment:  { label: 'In Fulfillment',  color: '#DC6803', bg: '#FFFAEB', dot: '#F79009' },
  pending_user:    { label: 'Pending User',    color: '#6941C6', bg: '#F4F3FF', dot: '#9E77ED' },
  fulfilled:       { label: 'Fulfilled',       color: '#067647', bg: '#ECFDF3', dot: '#12B76A' },
  closed:          { label: 'Closed',          color: '#475467', bg: '#F1F3F7', dot: '#475467' },
  rejected:        { label: 'Rejected',        color: '#B42318', bg: '#FEF3F2', dot: '#F04438' },
  cancelled:       { label: 'Cancelled',       color: '#475467', bg: '#F1F3F7', dot: '#98A2B3' },
};

export const catalogCategoryMeta: Record<CatalogCategory, { label: string; icon: string; color: string }> = {
  access:        { label: 'Access',        icon: 'Key',         color: '#1F4FD4' },
  equipment:     { label: 'Equipment',     icon: 'Laptop',      color: '#0BA5EC' },
  software:      { label: 'Software',      icon: 'Package',     color: '#6941C6' },
  communication: { label: 'Communication', icon: 'Phone',       color: '#067647' },
  personnel:     { label: 'Personnel',     icon: 'Users',       color: '#DC6803' },
  general:       { label: 'General',       icon: 'Folder',      color: '#475467' },
};

export const workflowStepStatusMeta: Record<WorkflowStepStatus, { label: string; color: string; nodeStyle: 'completed' | 'active' | 'pending' | 'rejected' | 'skipped' }> = {
  pending:    { label: 'Pending',    color: '#98A2B3', nodeStyle: 'pending' },
  active:     { label: 'Active',     color: '#1F4FD4', nodeStyle: 'active' },
  completed:  { label: 'Completed',  color: '#12B76A', nodeStyle: 'completed' },
  skipped:    { label: 'Skipped',    color: '#98A2B3', nodeStyle: 'skipped' },
  rejected:   { label: 'Rejected',   color: '#F04438', nodeStyle: 'rejected' },
};

export const kbStatusMeta: Record<KBStatus, { label: string; color: string; bg: string }> = {
  draft:      { label: 'Draft',      color: '#475467', bg: '#F1F3F7' },
  in_review:  { label: 'In Review',  color: '#DC6803', bg: '#FFFAEB' },
  published:  { label: 'Published',  color: '#067647', bg: '#ECFDF3' },
  archived:   { label: 'Archived',   color: '#475467', bg: '#F1F3F7' },
  expired:    { label: 'Expired',    color: '#B42318', bg: '#FEF3F2' },
};

export const kbContentTypeMeta: Record<KBContentType, { label: string; icon: string }> = {
  how_to:              { label: 'How-To',              icon: 'ListChecks' },
  troubleshooting:     { label: 'Troubleshooting',     icon: 'Wrench' },
  runbook:             { label: 'Runbook',             icon: 'BookOpen' },
  reference:           { label: 'Reference',           icon: 'FileText' },
  faq:                 { label: 'FAQ',                 icon: 'HelpCircle' },
  incident_postmortem: { label: 'Postmortem',          icon: 'Microscope' },
};
```

---

## 🔀 ROUTING UPDATE

In `src/routes/index.tsx`, replace placeholders:

```tsx
// Replace
{ path: 'portal',                      element: <Placeholder ... /> },
{ path: 'portal/catalog',              element: <Placeholder ... /> },
{ path: 'portal/my-requests',          element: <Placeholder ... /> },
{ path: 'requests',                    element: <Placeholder ... /> },
{ path: 'kb',                          element: <Placeholder ... /> },
{ path: 'kb/:slug',                    element: <Placeholder ... /> },
{ path: 'kb/editor',                   element: <Placeholder ... /> },
{ path: 'kb/analytics',                element: <Placeholder ... /> },

// With (note order: literal paths BEFORE :param paths)
{ path: 'portal',                      element: <PortalHome /> },
{ path: 'portal/catalog',              element: <Catalog /> },
{ path: 'portal/catalog/:itemId',      element: <CatalogItemDetail /> },
{ path: 'portal/my-requests',          element: <MyRequests /> },
{ path: 'requests',                    element: <RequestQueue /> },
{ path: 'requests/:requestId',         element: <RequestDetail /> },
{ path: 'kb',                          element: <KBBrowse /> },
{ path: 'kb/analytics',                element: <KBAnalytics /> },
{ path: 'kb/editor',                   element: <KBEditor /> },
{ path: 'kb/editor/:slug',             element: <KBEditor /> },
{ path: 'kb/:slug',                    element: <ArticleView /> },
```

**Critical:** `kb/analytics` and `kb/editor` and `kb/editor/:slug` must come BEFORE `kb/:slug`. Same for `requests/:requestId` ordering.

---

## 🔗 CROSS-LINKING

Real links activated by Doc 3b:
- Portal home → catalog → `/portal/catalog`
- Catalog item → request flow → `/portal/catalog/{itemId}`
- Submit request success → `/portal/my-requests` real
- Catalog item → linked KB → `/kb/{slug}` real
- Request detail → catalog item → `/portal/catalog/{itemId}` real
- Request detail → linked CIs → `/cmdb/{ciId}` (Doc 1)
- Request detail → linked incident → `/incidents/{id}` (Doc 3a real)
- Request detail → linked change → `/changes/{id}` (Doc 4 placeholder)
- KB article → linked CIs → `/cmdb/{ciId}` (Doc 1)
- KB article → linked incidents → `/incidents/{id}` (Doc 3a real)
- KB article → linked problems → `/problems/{id}` (Doc 3a real)
- KB article inline `KB-XXXXX` references → `/kb/{slug-of-that-id}` real
- KB article inline `INC-...`, `PRB-...` references → real cross-links
- KB analytics gap card → "Create article" → `/kb/editor?title={search-term}` with prefill

**Update Doc 0 dashboard:**
- Inbox preview item `ibx-004` (access request) now navigates to real `/requests/REQ-2026-00342` (or `/portal/my-requests` for end user perspective)
- Notification dropdown `ntf-006` (KB article published) navigates to real `/kb/{slug}`

**Update Doc 3a problem detail:**
- "Linked KB articles" tab now uses real KB data
- "Promote to known error → Suggest as KB article" button now navigates to `/kb/editor` with prefilled title and body from problem's known error data

**Update Doc 3a incident detail:**
- "Suggest KB article" quick action navigates to `/kb/editor?source=incident&id=INC-...`
- "Linked KB articles" section in linked items tab uses real KB data filtered by `linkedIncidentIds`

---

## ✅ QUALITY CHECKLIST

- [ ] All 11 routes work without 404 (correct order: literals before params)
- [ ] `/portal` shows hero search + quick actions + activity + popular catalog items
- [ ] Hero search input works with autosuggest on real catalog data
- [ ] Active requests show inline mini-stepper with current step highlighted
- [ ] `/portal/catalog` shows search-first layout (Notion-style)
- [ ] Without query: shows recommended + browse by category
- [ ] With query: shows result cards with relevance sort options
- [ ] `/portal/catalog/CAT-ACC-001` shows item detail with workflow preview
- [ ] Multi-step request flow: Step 1 (info) → Step 2 (form) → Step 3 (review) → Submit
- [ ] Form fields render correctly per `formFields` schema (text, select, textarea, checkbox, etc.)
- [ ] Required field validation, character count for textarea, etc.
- [ ] Conditional fields show/hide via `showWhen`
- [ ] Review step shows all submitted values with edit-back capability
- [ ] Submit success shows confirmation + auto-redirect after 2s
- [ ] `/portal/my-requests` shows user-friendly request cards with mini stepper
- [ ] Tabs (All / Active / Completed / Drafts) filter correctly
- [ ] `/requests` shows agent queue table with quick filter chips
- [ ] "Awaiting my approval" filter shows requests where current user is current step approver
- [ ] `/requests/REQ-2026-00342` shows linear stepper prominently with all 4 steps
- [ ] Active step shows inline approve/reject buttons (when current user is approver)
- [ ] Approve modal works, advances workflow to next step on confirm
- [ ] Reject modal requires reason, halts workflow visually (skipped subsequent steps)
- [ ] All 5 detail tabs work (Overview, Form responses, Activity, Comments, Linked items)
- [ ] `/kb` shows browse interface with category sidebar + main results
- [ ] Search filters articles real-time across title, summary, body, tags
- [ ] Article cards show metadata (author, updated, views, helpful%)
- [ ] `/kb/payment-api-restart-procedure` shows article view with proper markdown rendering
- [ ] Code blocks have syntax highlighting (or at minimum monospace + colored bg)
- [ ] Inline KB references (`KB-XXXXX`) become hyperlinks
- [ ] Inline incident/problem references become hyperlinks
- [ ] Helpful Yes/No buttons work (optimistic UI, "no" opens feedback modal)
- [ ] Right rail shows related + references + ToC with scroll-spy
- [ ] `/kb/editor` shows new-article state with empty editor
- [ ] `/kb/editor/payment-api-restart-procedure` pre-populates with article data
- [ ] Slash commands: typing `/` at start of line opens command palette
- [ ] Selecting a slash command inserts correct markdown snippet
- [ ] `/link-kb` opens article picker modal
- [ ] Live preview updates as user types
- [ ] Auto-save indicator shows ("Auto-saved 12s ago")
- [ ] Publish split button: Now / Submit for review / Save as draft
- [ ] `/kb/analytics` shows hero "4 content gaps detected" with prominent warning styling
- [ ] Each gap card has search count + suggested action + Create article CTA
- [ ] Top viewed table sorted correctly with trend arrows
- [ ] Top searches table highlights gap rows in amber
- [ ] Reviews overdue table shows due dates
- [ ] Views over time SVG line chart renders
- [ ] Doc 0 inbox `ibx-004` navigates to real request detail
- [ ] Doc 3a problem detail "Suggest as KB article" navigates to editor with prefill
- [ ] Doc 3a incident detail Linked Items uses real KB data
- [ ] All public IDs use mono font
- [ ] Sidebar nav highlights "Knowledge Base" or "Service Requests" or appropriate parent
- [ ] No console / TypeScript errors

---

## 🚀 DELIVERABLE

Extend the existing project. Confirm:

1. New types in `src/types/request.ts` and `src/types/knowledge.ts`, re-exported
2. Mock data: `catalogItems.ts`, `serviceRequests.ts`, `kbCategories.ts`, `kbArticles.ts`, `kbFeedback.ts`, `kbAnalytics.ts`
3. Module components in `src/components/portal/`, `src/components/requests/`, `src/components/kb/`
4. 11 route files in appropriate folders
5. Routing config updated (literal paths before parametric — order matters)
6. Sidebar items "Service Requests", "Self-Service Portal", "Knowledge Base" highlight correctly
7. Doc 0 + Doc 3a cross-links updated to use real Doc 3b data

After generation, do not start Doc 4. Wait for the next prompt.

---

*End of Doc 3b. Operational Response cluster complete.*
