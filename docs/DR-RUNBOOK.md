# Disaster Recovery Runbook

**Owner:** Platform engineering · **Last updated:** 2026-05-14 · **Status:** Draft v1

This runbook is for the OIS production deployment. It assumes the recommended
stack from [BACKEND-MIGRATION-STRATEGY.md](./BACKEND-MIGRATION-STRATEGY.md):
single-region Postgres + Redis, Node API + worker on Fly.io/K8s, static SPA
behind a CDN.

## 1 · Service tiers + targets

| Tier | Components | RTO | RPO |
|------|-----------|-----|-----|
| Tier 0 — Critical | Postgres primary, API process, edge | 4 h | 1 h |
| Tier 1 — Important | Worker process, Redis (cache + queue) | 8 h | 1 h |
| Tier 2 — Standard | Static SPA bundle, observability stack | 24 h | 24 h |

## 2 · What can fail and what to do

### 2.1 Postgres primary lost

**Detection:** `/ready` endpoint 503s, API logs `prisma:error connect`,
Grafana panel `db.connections.failed` spikes.

**Action:**
1. Confirm the managed Postgres status page; if planned maintenance, wait it
   out (managed providers auto-failover; RTO ≤ 30s in most cases).
2. If primary is truly down, promote the latest read replica (provider
   console). Update `DATABASE_URL` secret to the new primary endpoint.
3. Deploy API + worker with the updated secret. The Prisma client picks up
   the new URL on restart.
4. Verify with `/ready` and the audit log shows new writes.

**RPO:** Streaming replication should keep replica ≤ 60s behind. Worst case is
the last 1 minute of writes lost.

### 2.2 Postgres logical corruption (bad migration, accidental DELETE)

**Detection:** Data sanity check or user-reported corruption.

**Action:**
1. Put the API in **read-only mode**: set `READONLY=true` env, redeploy
   (when implemented, M6+; for now scale API to zero).
2. Restore the most recent nightly snapshot to a fresh database.
3. Replay WAL up to a point-in-time just before the corruption.
4. Validate by spot-checking a known-good entity.
5. Swap `DATABASE_URL` to the restored instance, redeploy, clear the
   read-only flag.

**RPO:** Up to the point-in-time chosen; typically minutes of loss.

### 2.3 Redis lost (sessions + queue + cache)

**Impact:**
- All active sessions invalidated → users see /login.
- Queued background jobs lost (e.g. webhook deliveries in flight).
- Cache misses → DB load spikes, brief latency increase.

**Action:**
1. Recreate the Redis instance (managed provider usually < 5 min).
2. Update `REDIS_URL` secret, redeploy.
3. Communicate to users that they need to log in again.
4. Audit log review for any in-flight mutations that may need manual replay
   (only if `READONLY` wasn't in use during the gap).

### 2.4 Region-wide outage (provider AZ + replica unreachable)

**Action:**
1. Trigger cross-region failover (manual today; automate in M6+).
2. Update DNS to point to the secondary region.
3. Promote the cross-region Postgres replica.
4. Once primary region recovers, rebalance (usually next maintenance window).

**RTO:** 4 h target; achievable only if cross-region replica is provisioned —
add to infrastructure backlog before declaring production-ready.

### 2.5 Application bug taking down a tenant

**Action:**
1. Disable feature flag for the offending feature (M6+; for now redeploy a
   previous commit).
2. If the bug corrupts data, follow §2.2 to roll back the tenant's data only.
3. File an incident in the OIS app itself and link the audit log query.

## 3 · Backup posture

| Item | Frequency | Retention | Verified |
|------|-----------|-----------|----------|
| Postgres snapshot | Nightly | 30 days | Weekly restore test (in `npm run dr:test`, future) |
| WAL archives | Continuous | 7 days | Implicit (used in PITR) |
| Config / secrets | On change | Versioned in Doppler/SOPS | Quarterly audit |
| Audit log export | Daily to object storage | 1 year | Monthly sample restore |
| Tenant data export | On request | 30 days | DSAR flow |

## 4 · Communication

- **Status page:** Update within 15 min of incident declaration. Use the
  internal status page editor (`/status-page/entries`).
- **Stakeholders:** Page on-call via PagerDuty for Tier 0 + Tier 1.
- **Customers:** Customer-impact statuses go on the public status page.

## 5 · Post-incident

Within 5 business days, write a post-incident review (template in
`docs/templates/PIR.md`, future) covering:

1. Timeline
2. Customer impact
3. Root cause
4. Detection gaps
5. Action items (owner + due date)

Link the PIR from the audit log entry that captures the incident.

## 6 · Tabletop exercises

Run a tabletop exercise quarterly. Scenarios cycle through:
- Q1: Postgres primary failure
- Q2: Region outage
- Q3: Accidental `DELETE FROM incidents`
- Q4: Compromised admin account

Track outcomes (RTO/RPO actually achieved) in `docs/dr-exercises/` (future).
