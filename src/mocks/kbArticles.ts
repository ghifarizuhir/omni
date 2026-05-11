import { KBArticle } from '../types/knowledge';

export const mockKBArticles: KBArticle[] = [
  // ─── KB-00187 — SHOWCASE ──────────────────────────────────────────────────
  {
    id: 'kb-00187',
    slug: 'payment-api-restart-procedure',
    publicId: 'KB-00187',
    title: 'Runbook: Payment API restart procedure',
    summary: 'Step-by-step procedure to safely restart payment-worker pods to release stuck DB connections.',
    body: `# Runbook: Payment API restart procedure

> **When to use this:** Use when payment-api is returning 5xx errors with stuck DB connection pool.
> Verify with \`KB-00203 — Troubleshooting Payment API 5xx errors\` first.

## Prerequisites

- Production access to \`acme-prod-cluster\` (use \`KB-00156\` for SSH)
- \`kubectl\` configured for production context
- Acknowledged active incident (if any)

## Procedure

### 1. Verify the issue

Check current pool saturation:

\`\`\`bash
kubectl exec -n payment payment-api-0 -- \\
  psql -h pay-postgres-primary -U app -c \\
  "SELECT count(*) FROM pg_stat_activity WHERE state='active';"
\`\`\`

Expected: < 18 (out of pool size 20). If > 18, proceed.

### 2. Notify in incident channel

Post in \`#incidents\`:

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
kubectl exec -n payment payment-api-0 -- \\
  curl -s localhost:8080/health
\`\`\`

Pool should be back to ~10 active connections.

## Rollback

If restart did not resolve, escalate to L3 SRE. Do NOT iterate without diagnosis.

## Related

- \`KB-00203\` — Troubleshooting Payment API 5xx errors
- \`PRB-2026-00018\` — Recurring memory pressure on payment-api
- \`CHG-2026-00091\` — Permanent fix: migrate to pgbouncer`,
    status: 'published',
    visibility: 'internal',
    contentType: 'runbook',
    categoryId: 'kbc-002',
    categoryName: 'Runbooks',
    tags: ['payment', 'restart', 'runbook', 'pool-exhaustion', 'urgent'],
    authorId: 'u-005',
    authorName: 'Yuki Tanaka',
    contributorIds: ['u-004'],
    relatedCIIds: ['ci-app-pay-001', 'ci-app-pay-002'],
    relatedCIPublicIds: ['CI-APP-PAY-001', 'CI-APP-PAY-002'],
    linkedIncidentIds: [],
    linkedProblemIds: ['prb-2026-00018'],
    relatedArticleSlugs: ['troubleshooting-payment-api-5xx-errors', 'db-read-access-best-practices'],
    viewCount: 287,
    helpfulCount: 24,
    unhelpfulCount: 2,
    averageReadTimeSeconds: 180,
    publishedAt: '2026-04-16T09:00:00Z',
    reviewedAt: '2026-04-16T09:00:00Z',
    reviewDueAt: '2026-07-16T09:00:00Z',
    createdAt: '2026-04-15T10:00:00Z',
    updatedAt: '2026-04-16T09:00:00Z',
    version: 3,
    previousVersions: 2,
  },

  // ─── KB-00203 ─────────────────────────────────────────────────────────────
  {
    id: 'kb-00203',
    slug: 'troubleshooting-payment-api-5xx-errors',
    publicId: 'KB-00203',
    title: 'Troubleshooting: Payment API 5xx errors',
    summary: 'Decision flow for diagnosing 5xx errors on Payment API: pool exhaustion, downstream issues, or app bugs.',
    body: `# Troubleshooting: Payment API 5xx errors

> **Use this guide first** when you see 5xx errors from payment-api. It will tell you which runbook to follow.

## Quick triage checklist

Run these checks in order:

### 1. Check error rate and pattern

\`\`\`bash
kubectl logs -n payment deployment/payment-api --since=5m | grep -c 'ERROR'
\`\`\`

- **Sudden spike (>50 errors/min):** Likely DB pool exhaustion — go to step 2.
- **Gradual increase:** Likely a bad deploy — check recent changes.
- **Intermittent (<10 errors/min):** Likely downstream service flap — go to step 3.

### 2. Check DB connection pool

\`\`\`bash
kubectl exec -n payment payment-api-0 -- \\
  psql -h pay-postgres-primary -U app -c \\
  "SELECT state, count(*) FROM pg_stat_activity GROUP BY state;"
\`\`\`

- If \`active\` count > 18: **Pool exhausted** → follow \`KB-00187\` (restart procedure).
- If counts look normal: proceed to step 3.

### 3. Check downstream dependencies

\`\`\`bash
# Check order-service
curl -s https://order-api.internal/health | jq .status

# Check fraud-check service
curl -s https://fraud-api.internal/health | jq .status
\`\`\`

If either returns non-200: open an incident against the failing service.

### 4. Check for recent deploys

\`\`\`bash
kubectl rollout history deployment/payment-api -n payment
\`\`\`

If a deploy happened in the last 30 minutes, consider rollback.

## Escalation

If none of the above explains the issue, page L3 SRE via \`#incidents\`.

## Related

- \`KB-00187\` — Runbook: Payment API restart procedure
- \`PRB-2026-00018\` — Recurring memory pressure on payment-api`,
    status: 'published',
    visibility: 'internal',
    contentType: 'troubleshooting',
    categoryId: 'kbc-003',
    categoryName: 'Troubleshooting',
    tags: ['payment', 'troubleshooting', '5xx', 'pool-exhaustion'],
    authorId: 'u-004',
    authorName: 'David Okafor',
    contributorIds: ['u-005'],
    relatedCIIds: ['ci-app-pay-001', 'ci-db-pay-001'],
    relatedCIPublicIds: ['CI-APP-PAY-001', 'CI-DB-PAY-001'],
    linkedIncidentIds: ['INC-2026-00184', 'INC-2026-00156'],
    linkedProblemIds: ['prb-2026-00018'],
    relatedArticleSlugs: ['payment-api-restart-procedure'],
    viewCount: 412,
    helpfulCount: 38,
    unhelpfulCount: 1,
    averageReadTimeSeconds: 240,
    publishedAt: '2026-04-10T10:00:00Z',
    reviewedAt: '2026-04-10T10:00:00Z',
    reviewDueAt: '2026-07-10T10:00:00Z',
    createdAt: '2026-04-09T14:00:00Z',
    updatedAt: '2026-04-10T10:00:00Z',
    version: 2,
    previousVersions: 1,
  },

  // ─── KB-00231 ─────────────────────────────────────────────────────────────
  {
    id: 'kb-00231',
    slug: 'es-cluster-yellow-recovery',
    publicId: 'KB-00231',
    title: 'Runbook: ES cluster yellow status recovery',
    summary: 'How to recover Elasticsearch cluster from yellow to green status during peak load.',
    body: `# Runbook: ES cluster yellow status recovery

> **When to use this:** Elasticsearch cluster health is \`yellow\` — some replica shards are unassigned.

## Background

Yellow status means all primary shards are assigned but one or more replica shards are not. Data is safe but redundancy is reduced. During peak load, nodes may run out of disk or memory, causing replicas to be dropped.

## Procedure

### 1. Identify unassigned shards

\`\`\`bash
curl -s "http://es-cluster:9200/_cat/shards?h=index,shard,prirep,state,node" | grep UNASSIGNED
\`\`\`

### 2. Check node disk and heap

\`\`\`bash
curl -s "http://es-cluster:9200/_cat/nodes?h=name,diskUsed,heapPercent,load_1m"
\`\`\`

- **Disk > 85%:** Clear old indices. See index retention policy.
- **Heap > 75%:** Force GC or restart the heavy node.

### 3. Force shard allocation (if safe)

\`\`\`bash
curl -X POST "http://es-cluster:9200/_cluster/reroute?retry_failed=true"
\`\`\`

### 4. Verify recovery

\`\`\`bash
curl -s "http://es-cluster:9200/_cluster/health" | jq '.status'
\`\`\`

Expected: \`green\` within 5 minutes.

## Related

- \`INC-2026-00182\` — ES cluster yellow alert`,
    status: 'published',
    visibility: 'internal',
    contentType: 'runbook',
    categoryId: 'kbc-002',
    categoryName: 'Runbooks',
    tags: ['elasticsearch', 'cluster', 'runbook', 'yellow', 'recovery'],
    authorId: 'u-008',
    authorName: 'Aisha Khan',
    contributorIds: [],
    relatedCIIds: [],
    relatedCIPublicIds: [],
    linkedIncidentIds: ['INC-2026-00182'],
    linkedProblemIds: [],
    relatedArticleSlugs: [],
    viewCount: 45,
    helpfulCount: 5,
    unhelpfulCount: 0,
    averageReadTimeSeconds: 150,
    publishedAt: '2026-05-08T06:30:00Z',
    reviewedAt: '2026-05-08T06:30:00Z',
    reviewDueAt: '2026-08-08T06:30:00Z',
    createdAt: '2026-05-07T20:00:00Z',
    updatedAt: '2026-05-08T06:30:00Z',
    version: 1,
  },

  // ─── KB-00198 ─────────────────────────────────────────────────────────────
  {
    id: 'kb-00198',
    slug: 'db-read-access-best-practices',
    publicId: 'KB-00198',
    title: 'Best practices for production database read access',
    summary: 'Guidelines for safely querying production databases: query patterns, LIMITs, no joins on large tables.',
    body: `# Best practices for production database read access

Follow these rules whenever you have read access to a production database.

## Core rules

1. **Always use LIMIT** — Never run an unbounded \`SELECT *\`. Start with \`LIMIT 100\` and increase only if needed.
2. **Avoid joins on large tables** — \`payment_transactions\` and \`audit_log\` have hundreds of millions of rows. Cross-joining kills performance.
3. **Use read replicas** — Your access should be to a read replica, not the primary. Confirm with: \`SELECT pg_is_in_recovery();\` (should return \`t\`).
4. **No schema changes** — Read access does not grant DDL rights. Do not attempt ALTER, CREATE, or DROP.
5. **Respect PCI scope** — Any access to payment-related tables is subject to audit logging. See \`KB-00199\`.

## Query patterns

### Safe: paginated read
\`\`\`sql
SELECT id, amount, status, created_at
FROM payment_transactions
WHERE created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC
LIMIT 100 OFFSET 0;
\`\`\`

### Unsafe: unbounded query
\`\`\`sql
-- NEVER DO THIS
SELECT * FROM payment_transactions;
\`\`\`

## Access revocation

Your access is time-bound. Do not attempt to extend it by re-using credentials. Submit a new request via the Service Catalog.

## Related

- \`KB-00199\` — PCI-DSS data handling rules
- \`CAT-ACC-001\` — Service Catalog: Production DB Read Access`,
    status: 'published',
    visibility: 'internal',
    contentType: 'how_to',
    categoryId: 'kbc-004',
    categoryName: 'How-To Guides',
    tags: ['database', 'production', 'best-practices', 'pci-scope', 'compliance'],
    authorId: 'u-001',
    authorName: 'Sarah Chen',
    contributorIds: ['u-005'],
    relatedCIIds: ['ci-db-pay-001'],
    relatedCIPublicIds: ['CI-DB-PAY-001'],
    linkedIncidentIds: [],
    linkedProblemIds: [],
    relatedArticleSlugs: ['pci-dss-data-handling', 'payment-api-restart-procedure'],
    viewCount: 156,
    helpfulCount: 18,
    unhelpfulCount: 0,
    averageReadTimeSeconds: 120,
    publishedAt: '2026-03-20T10:00:00Z',
    reviewedAt: '2026-03-20T10:00:00Z',
    reviewDueAt: '2026-05-15T10:00:00Z',
    createdAt: '2026-03-19T14:00:00Z',
    updatedAt: '2026-03-20T10:00:00Z',
    version: 2,
    previousVersions: 1,
  },

  // ─── KB-00199 ─────────────────────────────────────────────────────────────
  {
    id: 'kb-00199',
    slug: 'pci-dss-data-handling',
    publicId: 'KB-00199',
    title: 'Reference: PCI-DSS data handling rules',
    summary: 'Compliance summary for handling cardholder data: storage, transmission, retention rules.',
    body: `# Reference: PCI-DSS data handling rules

> This document summarises our internal obligations under PCI-DSS v4. For the full policy, see Confluence: /wiki/pci-policy.

## What counts as cardholder data (CHD)

- Primary Account Number (PAN) — the 16-digit card number
- Cardholder name
- Expiration date
- Service code
- **Sensitive Authentication Data (SAD):** CVV, PIN, magnetic stripe — NEVER stored post-auth

## Storage rules

| Data type | Allowed to store? | If stored: |
|-----------|------------------|------------|
| PAN (truncated) | Yes | Mask all but last 4 digits in logs |
| PAN (full) | Yes, if necessary | AES-256 encrypted at rest |
| CVV / CVV2 | **No** | Purge immediately post-auth |
| PIN | **No** | Never stored |

## Query restrictions

When querying \`payment_transactions\`:
- Do not SELECT the \`pan_full\` or \`cvv_hash\` columns
- Use \`pan_last4\` for display
- All access is audit-logged to the \`pci_audit_log\` table

## Transmission rules

- All CHD in transit must use TLS 1.2+
- No CHD in URL query parameters
- No CHD in log files (our logger automatically redacts PAN patterns)

## Retention

- Transaction records: 13 months (regulatory minimum)
- Audit logs: 24 months
- Logs containing CHD: masked and retained 12 months

## Violations

Report suspected violations immediately to security@acme.io and your manager.

## Related

- \`KB-00198\` — Best practices for production database read access`,
    status: 'published',
    visibility: 'internal',
    contentType: 'reference',
    categoryId: 'kbc-005',
    categoryName: 'Reference',
    tags: ['pci-dss', 'compliance', 'security', 'cardholder-data'],
    authorId: 'u-001',
    authorName: 'Sarah Chen',
    contributorIds: [],
    relatedCIIds: ['ci-db-pay-001'],
    relatedCIPublicIds: ['CI-DB-PAY-001'],
    linkedIncidentIds: [],
    linkedProblemIds: [],
    relatedArticleSlugs: ['db-read-access-best-practices'],
    viewCount: 234,
    helpfulCount: 12,
    unhelpfulCount: 1,
    averageReadTimeSeconds: 200,
    publishedAt: '2026-02-10T10:00:00Z',
    reviewedAt: '2026-02-10T10:00:00Z',
    reviewDueAt: '2026-08-10T10:00:00Z',
    createdAt: '2026-02-09T14:00:00Z',
    updatedAt: '2026-02-10T10:00:00Z',
    version: 1,
  },

  // ─── KB-00156 ─────────────────────────────────────────────────────────────
  {
    id: 'kb-00156',
    slug: 'ssh-access-via-bastion',
    publicId: 'KB-00156',
    title: 'How to: SSH to production servers via bastion',
    summary: 'Configure SSH for accessing production hosts through the bastion jump server.',
    body: `# How to: SSH to production servers via bastion

All production SSH access routes through the bastion jump server. Direct access is blocked at the firewall.

## Prerequisites

- Your SSH public key must be registered in 1Password and enrolled via IT (see onboarding guide)
- You must have production access enabled (request via \`CAT-ACC-002\` if not)

## SSH config setup

Add the following to \`~/.ssh/config\`:

\`\`\`
Host bastion
  HostName bastion.acme.io
  User <your-username>
  IdentityFile ~/.ssh/id_ed25519
  ServerAliveInterval 60

Host *.prod.internal
  User <your-username>
  ProxyJump bastion
  IdentityFile ~/.ssh/id_ed25519
\`\`\`

## Connect to a production host

\`\`\`bash
# Example: connect to payment-api-0
ssh payment-api-0.prod.internal

# Example: connect to pay-postgres-primary (read-only)
ssh pg-primary.prod.internal
\`\`\`

## Session recording

> **Note:** All production SSH sessions are recorded and stored for 90 days for audit purposes.

## Troubleshooting

- **Connection refused:** Your key may not be enrolled. Check with IT.
- **Permission denied (publickey):** Ensure your key matches what's in 1Password.
- **Bastion timeout:** The bastion has a 1-hour idle timeout. Reconnect if dropped.`,
    status: 'published',
    visibility: 'internal',
    contentType: 'how_to',
    categoryId: 'kbc-004',
    categoryName: 'How-To Guides',
    tags: ['ssh', 'bastion', 'production', 'access', 'security'],
    authorId: 'u-007',
    authorName: 'Tom Bergstrom',
    contributorIds: ['u-001'],
    relatedCIIds: [],
    relatedCIPublicIds: [],
    linkedIncidentIds: [],
    linkedProblemIds: [],
    relatedArticleSlugs: ['db-read-access-best-practices'],
    viewCount: 312,
    helpfulCount: 41,
    unhelpfulCount: 0,
    averageReadTimeSeconds: 150,
    publishedAt: '2026-01-20T10:00:00Z',
    reviewedAt: '2026-01-20T10:00:00Z',
    reviewDueAt: '2026-07-20T10:00:00Z',
    createdAt: '2026-01-19T14:00:00Z',
    updatedAt: '2026-01-20T10:00:00Z',
    version: 2,
    previousVersions: 1,
  },

  // ─── KB-00134 ─────────────────────────────────────────────────────────────
  {
    id: 'kb-00134',
    slug: 'oncall-handover-checklist',
    publicId: 'KB-00134',
    title: 'On-call handover checklist',
    summary: 'What to review before handing off the on-call rotation to the next engineer.',
    body: `# On-call handover checklist

Complete this checklist at the end of every on-call shift before handing over.

## 30 minutes before handover

- [ ] Review open incidents — brief your replacement on each active incident's status
- [ ] Check for any SLA warnings in the Monitoring dashboard
- [ ] Ensure all P1/P2 incidents have an active owner assigned for the new shift
- [ ] Post a summary in \`#oncall-handover\` Slack channel

## Handover message template

\`\`\`
On-call handover — <date>
Incoming: @<next-engineer>

ACTIVE INCIDENTS
- INC-XXXX: <brief description> — owned by <name>, status: <status>

MONITORING NOTES
- <any known noisy alerts or expected anomalies>

PENDING ACTIONS
- <any tasks you started but didn't complete>

DOCS UPDATED
- <any KB articles you created or edited>
\`\`\`

## After handover

- Update your on-call calendar in PagerDuty
- Log off from shared credentials (vault sessions, etc.)

## Related

- \`KB-00203\` — Troubleshooting: Payment API 5xx errors (most common alert)`,
    status: 'published',
    visibility: 'internal',
    contentType: 'runbook',
    categoryId: 'kbc-002',
    categoryName: 'Runbooks',
    tags: ['oncall', 'handover', 'checklist', 'operations'],
    authorId: 'u-004',
    authorName: 'David Okafor',
    contributorIds: ['u-005', 'u-008'],
    relatedCIIds: [],
    relatedCIPublicIds: [],
    linkedIncidentIds: [],
    linkedProblemIds: [],
    relatedArticleSlugs: ['troubleshooting-payment-api-5xx-errors'],
    viewCount: 178,
    helpfulCount: 8,
    unhelpfulCount: 0,
    averageReadTimeSeconds: 120,
    publishedAt: '2025-12-01T10:00:00Z',
    reviewedAt: '2026-03-01T10:00:00Z',
    reviewDueAt: '2026-06-01T10:00:00Z',
    createdAt: '2025-11-30T14:00:00Z',
    updatedAt: '2026-03-01T10:00:00Z',
    version: 3,
    previousVersions: 2,
  },

  // ─── KB-00145 ─────────────────────────────────────────────────────────────
  {
    id: 'kb-00145',
    slug: 'troubleshooting-slack-notifications',
    publicId: 'KB-00145',
    title: 'Troubleshooting: Slack notifications not arriving',
    summary: 'If alerts/notifications aren\'t reaching Slack, check these 5 things first.',
    body: `# Troubleshooting: Slack notifications not arriving

If your PagerDuty alerts, monitoring notifications, or OIS alerts are not showing up in Slack, follow this guide.

## Check 1: Slack app status

Visit [status.slack.com](https://status.slack.com) — if Slack is having an incident, wait it out.

## Check 2: Channel webhook

\`\`\`bash
# Test the webhook directly
curl -X POST -H 'Content-type: application/json' \\
  --data '{"text":"Test alert from ops"}' \\
  $SLACK_WEBHOOK_URL
\`\`\`

If you get a non-200 response, the webhook may be revoked. Re-create it in Slack's app settings.

## Check 3: Alert routing config

In OIS → Monitoring → Alert Routing, verify:
- The route for the relevant service points to the correct Slack channel
- The route is active (not paused or in maintenance window)

## Check 4: PagerDuty Slack integration

In PagerDuty → Integrations → Slack:
- Confirm the workspace is connected
- Confirm the channel name hasn't changed (renames break the integration)

## Check 5: Bot permissions

The OIS Slack bot needs \`chat:write\` permission on the target channel. If the channel is private, the bot must be added explicitly.

## Still stuck?

Open a ticket with \`CAT-ACC-004\` for Slack channel issues, or ping \`#it-support\`.`,
    status: 'published',
    visibility: 'internal',
    contentType: 'troubleshooting',
    categoryId: 'kbc-003',
    categoryName: 'Troubleshooting',
    tags: ['slack', 'notifications', 'alerts', 'troubleshooting'],
    authorId: 'u-002',
    authorName: 'Marcus Hill',
    contributorIds: [],
    relatedCIIds: [],
    relatedCIPublicIds: [],
    linkedIncidentIds: [],
    linkedProblemIds: [],
    relatedArticleSlugs: [],
    viewCount: 89,
    helpfulCount: 7,
    unhelpfulCount: 1,
    averageReadTimeSeconds: 130,
    publishedAt: '2026-02-15T10:00:00Z',
    reviewedAt: '2026-02-15T10:00:00Z',
    reviewDueAt: '2026-08-15T10:00:00Z',
    createdAt: '2026-02-14T14:00:00Z',
    updatedAt: '2026-02-15T10:00:00Z',
    version: 1,
  },

  // ─── KB-00120 ─────────────────────────────────────────────────────────────
  {
    id: 'kb-00120',
    slug: 'laptop-onboarding',
    publicId: 'KB-00120',
    title: 'Getting started: New laptop onboarding',
    summary: 'First-day setup instructions for your new company laptop.',
    body: `# Getting started: New laptop onboarding

Welcome! Follow these steps to get your laptop ready on day one.

## Step 1: MDM enrollment

Your laptop ships with MDM pre-enrolled. On first boot, sign in with your \`@acme.io\` account. This installs required security tools automatically.

## Step 2: Software setup

The following apps install automatically via MDM:
- 1Password (open first — your credentials are waiting)
- Slack (join \`#general\` and \`#eng-team\`)
- Zoom
- Chrome / Firefox

Additional dev tools: submit a \`CAT-SW-002\` request (Workstation Software Install).

## Step 3: SSH key setup

\`\`\`bash
# Generate a new key
ssh-keygen -t ed25519 -C "your.name@acme.io"

# Add to 1Password and to your GitHub profile
cat ~/.ssh/id_ed25519.pub
\`\`\`

## Step 4: VPN

Install Tailscale from the Acme IT Portal. Authenticate with your \`@acme.io\` SSO.

## Step 5: Access requests

Submit these from the Service Catalog (\`/portal/catalog\`):
- GitHub access to your team's repos (\`CAT-ACC-003\`)
- Any production database access (\`CAT-ACC-001\`)

## Help

Ping \`#it-support\` in Slack or email \`itservicedesk@acme.io\`.`,
    status: 'published',
    visibility: 'internal',
    contentType: 'how_to',
    categoryId: 'kbc-001',
    categoryName: 'Getting Started',
    tags: ['onboarding', 'laptop', 'new-hire', 'setup'],
    authorId: 'u-002',
    authorName: 'Marcus Hill',
    contributorIds: ['u-001'],
    relatedCIIds: [],
    relatedCIPublicIds: [],
    linkedIncidentIds: [],
    linkedProblemIds: [],
    relatedArticleSlugs: ['ois-platform-overview', 'ssh-access-via-bastion'],
    viewCount: 89,
    helpfulCount: 11,
    unhelpfulCount: 0,
    averageReadTimeSeconds: 180,
    publishedAt: '2025-11-01T10:00:00Z',
    reviewedAt: '2026-02-01T10:00:00Z',
    reviewDueAt: '2026-08-10T10:00:00Z',
    createdAt: '2025-10-30T14:00:00Z',
    updatedAt: '2026-02-01T10:00:00Z',
    version: 4,
    previousVersions: 3,
  },

  // ─── KB-00121 ─────────────────────────────────────────────────────────────
  {
    id: 'kb-00121',
    slug: 'ois-platform-overview',
    publicId: 'KB-00121',
    title: 'Getting started: OIS platform overview',
    summary: 'Introduction to the OIS platform for new IT staff.',
    body: `# Getting started: OIS platform overview

OIS (Omni Intelligence Suite) is Acme's internal IT operations platform. This guide helps new IT staff understand the key modules.

## Core modules

### Monitoring
Real-time event stream from all infrastructure. Events auto-correlate to CIs. P1 alerts page on-call immediately.

Access: **OIS → Monitoring → Events**

### CMDB
Configuration item database. Every service, server, database, and endpoint is tracked here with dependency relationships.

Access: **OIS → CMDB**

### Incident Management
Track and resolve operational incidents. Linked to monitoring events, problems, and changes.

Access: **OIS → Incidents**

### Service Requests
Self-service portal for equipment, access, and software requests. Both end-users (\`/portal\`) and agents (\`/requests\`) have dedicated views.

Access: **OIS → Portal** (end user) or **OIS → Requests** (agent queue)

### Knowledge Base
Runbooks, troubleshooting guides, and how-tos. Linked to incidents and problems. You're reading it now.

Access: **OIS → Knowledge Base**

## Getting help

- Technical issues with OIS: \`#ois-support\` in Slack
- Feature requests: submit via the ideas backlog in Linear

## Related

- \`KB-00120\` — New laptop onboarding`,
    status: 'published',
    visibility: 'internal',
    contentType: 'how_to',
    categoryId: 'kbc-001',
    categoryName: 'Getting Started',
    tags: ['ois', 'platform', 'overview', 'onboarding', 'new-hire'],
    authorId: 'u-001',
    authorName: 'Sarah Chen',
    contributorIds: ['u-006'],
    relatedCIIds: [],
    relatedCIPublicIds: [],
    linkedIncidentIds: [],
    linkedProblemIds: [],
    relatedArticleSlugs: ['laptop-onboarding'],
    viewCount: 142,
    helpfulCount: 14,
    unhelpfulCount: 1,
    averageReadTimeSeconds: 150,
    publishedAt: '2025-11-05T10:00:00Z',
    reviewedAt: '2026-03-05T10:00:00Z',
    reviewDueAt: '2026-09-05T10:00:00Z',
    createdAt: '2025-11-04T14:00:00Z',
    updatedAt: '2026-03-05T10:00:00Z',
    version: 3,
    previousVersions: 2,
  },

  // ─── KB-00210 — ARCHIVED ──────────────────────────────────────────────────
  {
    id: 'kb-00210',
    slug: 'legacy-runbook-search-cluster',
    publicId: 'KB-00210',
    title: '[Legacy] Search cluster manual indexing',
    summary: 'Old procedure for manual search indexing — superseded by KB-00231.',
    body: `# [LEGACY] Search cluster manual indexing

> **ARCHIVED** — This procedure is no longer valid. The search cluster has been migrated to managed Elasticsearch.
> See \`KB-00231\` for current runbooks.

## Old procedure (for reference only)

This article described the manual indexing procedure for the legacy Solr-based search cluster that was decommissioned in February 2026.

Do not follow these steps on the current cluster.`,
    status: 'archived',
    visibility: 'internal',
    contentType: 'runbook',
    categoryId: 'kbc-002',
    categoryName: 'Runbooks',
    tags: ['legacy', 'archived', 'search', 'solr'],
    authorId: 'u-004',
    authorName: 'David Okafor',
    contributorIds: [],
    relatedCIIds: [],
    relatedCIPublicIds: [],
    linkedIncidentIds: [],
    linkedProblemIds: [],
    relatedArticleSlugs: ['es-cluster-yellow-recovery'],
    viewCount: 12,
    helpfulCount: 0,
    unhelpfulCount: 2,
    averageReadTimeSeconds: 60,
    publishedAt: '2025-09-01T10:00:00Z',
    reviewedAt: '2026-04-08T10:00:00Z',
    createdAt: '2025-09-01T10:00:00Z',
    updatedAt: '2026-04-08T10:00:00Z',
    version: 1,
  },

  // ─── KB-00248 — DRAFT ─────────────────────────────────────────────────────
  {
    id: 'kb-00248',
    slug: 'draft-payment-pgbouncer-migration',
    publicId: 'KB-00248',
    title: 'Runbook: Payment migration to pgbouncer (DRAFT)',
    summary: 'Procedure for migrating payment-api from direct DB connections to pgbouncer pooling.',
    body: `# Runbook: Payment migration to pgbouncer (DRAFT)

> **DRAFT** — This article is under active authoring and has not been reviewed.

## Overview

This runbook will cover the cutover from payment-api's direct PostgreSQL connections to connection pooling via pgbouncer.

## TODO

- [ ] Pre-migration checklist
- [ ] pgbouncer config validation steps
- [ ] Canary rollout procedure
- [ ] Rollback steps
- [ ] Post-migration verification

## Related

- \`PRB-2026-00018\` — Root problem driving this migration
- \`CHG-2026-00091\` — Change request for the migration`,
    status: 'draft',
    visibility: 'internal',
    contentType: 'runbook',
    categoryId: 'kbc-002',
    categoryName: 'Runbooks',
    tags: ['payment', 'pgbouncer', 'migration', 'draft', 'runbook'],
    authorId: 'u-004',
    authorName: 'David Okafor',
    contributorIds: [],
    relatedCIIds: ['ci-db-pay-001'],
    relatedCIPublicIds: ['CI-DB-PAY-001'],
    linkedIncidentIds: [],
    linkedProblemIds: ['prb-2026-00018'],
    relatedArticleSlugs: ['payment-api-restart-procedure', 'troubleshooting-payment-api-5xx-errors'],
    viewCount: 0,
    helpfulCount: 0,
    unhelpfulCount: 0,
    averageReadTimeSeconds: 0,
    createdAt: '2026-05-07T14:00:00Z',
    updatedAt: '2026-05-09T08:00:00Z',
    version: 1,
  },

  // ─── KB-00215 — Troubleshooting Auth Service ──────────────────────────────
  {
    id: 'kb-00215',
    slug: 'troubleshooting-auth-service-latency',
    publicId: 'KB-00215',
    title: 'Troubleshooting: Auth service latency spikes',
    summary: 'Diagnose and resolve unexpected latency spikes in the auth service.',
    body: `# Troubleshooting: Auth service latency spikes

Auth latency spikes affect all services that rely on token validation. Follow this guide when P99 auth latency exceeds 500ms.

## Quick checks

### 1. Check auth-postgres connection pool

\`\`\`bash
kubectl exec -n auth auth-api-0 -- \\
  psql -h auth-postgres -U app -c \\
  "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"
\`\`\`

If idle connections > 40: pool fragmentation. Restart auth-api pods with \`kubectl rollout restart deployment/auth-api -n auth\`.

### 2. Check Redis cache hit rate

Auth uses Redis for token caching. A cold cache causes DB hits on every request.

\`\`\`bash
redis-cli -h auth-redis INFO stats | grep keyspace_hits
redis-cli -h auth-redis INFO stats | grep keyspace_misses
\`\`\`

Hit rate below 80% is abnormal.

### 3. Check for expired tokens flood

A sudden surge of expired token validations can saturate the service.

\`\`\`bash
kubectl logs -n auth deployment/auth-api --since=10m | grep -c 'token_expired'
\`\`\`

If > 1000/min, check for a recently rotated signing key or clock skew issue.

## Escalation

If none of the above resolves the issue, page L3 SRE.`,
    status: 'published',
    visibility: 'internal',
    contentType: 'troubleshooting',
    categoryId: 'kbc-003',
    categoryName: 'Troubleshooting',
    tags: ['auth', 'latency', 'troubleshooting', 'redis', 'performance'],
    authorId: 'u-005',
    authorName: 'Yuki Tanaka',
    contributorIds: ['u-004'],
    relatedCIIds: [],
    relatedCIPublicIds: [],
    linkedIncidentIds: [],
    linkedProblemIds: [],
    relatedArticleSlugs: ['troubleshooting-payment-api-5xx-errors'],
    viewCount: 67,
    helpfulCount: 6,
    unhelpfulCount: 0,
    averageReadTimeSeconds: 160,
    publishedAt: '2026-04-01T10:00:00Z',
    reviewedAt: '2026-04-01T10:00:00Z',
    reviewDueAt: '2026-07-01T10:00:00Z',
    createdAt: '2026-03-31T14:00:00Z',
    updatedAt: '2026-04-01T10:00:00Z',
    version: 1,
  },
];

export const getArticleBySlug = (slug: string) =>
  mockKBArticles.find(a => a.slug === slug);

export const getArticleById = (id: string) =>
  mockKBArticles.find(a => a.id === id || a.publicId === id);

export const getPublishedArticles = () =>
  mockKBArticles.filter(a => a.status === 'published');

export const getArticlesByCategory = (categoryId: string) =>
  mockKBArticles.filter(a => a.categoryId === categoryId && a.status === 'published');

export const getRelatedArticles = (slugs: string[]) =>
  mockKBArticles.filter(a => slugs.includes(a.slug));

export const getKBArticlesByCI = (ciId: string): typeof mockKBArticles =>
  mockKBArticles.filter(
    a => a.relatedCIIds?.includes(ciId) || a.relatedCIPublicIds?.includes(ciId),
  );
