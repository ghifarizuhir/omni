# PROMPT: MVP UI — OIS (Omni Intelligence Suite)
## Doc 4b — Change & Delivery Cluster: Deployment + Validation & Testing

> **Prerequisite:** Doc 0 + 1 + 2 + 3a + 3b + 4a sudah di-execute di Build Mode session yang sama.
> **Modules:** Deployment Management (§7.7) + Service Validation and Testing (§7.8)
> **Routes covered:** `/deployments`, `/deployments/[id]`, `/environments`, `/testing/plans`, `/testing/cases`, `/testing/runs`, `/testing/sign-off`

---

## 🎯 SCOPE & DEPENDENCIES

Doc 4b melengkapi cluster **Change & Delivery**. Karakter modul:

- **Deployment** — execution layer. Deployment = "memindahkan komponen ke environment" (per ITIL, Release ≠ Deploy). Live, real-time-ish, dramatic visualization.
- **Validation & Testing** — quality gate. Test plans, cases, runs, sign-off. Dominant view: **Test runs prominent** (live execution feel).

**Reuse from Doc 0–4a:**
- AppShell, all UI primitives, formatters
- Mock data: users, teams, services, CIs, events, incidents, problems, KB, changes, releases
- Cross-link: deployments ↔ releases (Doc 4a real), deployments ↔ changes (Doc 4a real), deployments ↔ CIs (Doc 1 real)

**To be added in Doc 4b:**
- Domain types: `Deployment`, `DeploymentStage`, `DeploymentLogEntry`, `EnvironmentInfo`, `TestPlan`, `TestCase`, `TestRun`, `TestStepResult`, `SignOff`
- Mock data: 20 deployments, 3 environments, 10 test plans/cases, 10 test runs (some live), 4 sign-off items
- Module components in `src/components/deployments/` and `src/components/testing/`
- 7 route implementations
- Update routing config + cross-link to existing modules

---

## 🧩 DOMAIN TYPES (`src/types/deployment.ts`)

```typescript
import { Severity } from './common';
import { Environment } from './release';

// Deployment lifecycle
export type DeploymentStatus =
  | 'pending'           // Queued, not started
  | 'running'           // Currently executing
  | 'success'           // Completed successfully
  | 'failed'            // Failed during execution
  | 'rolled_back'       // Rolled back after running
  | 'cancelled'         // Cancelled before completion
  | 'rolling_back';     // Rollback in progress

// Deployment strategy
export type DeploymentStrategy =
  | 'rolling'           // Gradual replacement (default for k8s)
  | 'blue_green'        // Two environments, switch at the end
  | 'canary'            // Small % first, then full
  | 'big_bang'          // All at once
  | 'phased';           // Multiple phases with manual gates

// Deployment trigger source
export type DeploymentTrigger =
  | 'manual'            // User-initiated
  | 'cicd_pipeline'     // GitHub Actions, GitLab CI, etc.
  | 'scheduled'         // Cron-based
  | 'auto_promotion';   // Auto-promote from previous env

// Stage status (for k8s-style stages within a deployment)
export type DeploymentStageStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'skipped';

// Log entry levels
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

// === DEPLOYMENT ===
export interface Deployment {
  id: string;
  publicId: string;                  // e.g. "DEP-2026-00342"

  // Component being deployed
  componentName: string;             // e.g. "payment-api"
  componentCIPublicId?: string;
  artifactRef: string;               // e.g. "registry.acme.io/payment-api:2.4.1"
  commitSha: string;                 // Short SHA, e.g. "7e3f9a2"
  commitMessage?: string;            // First line of commit message
  branch: string;                    // e.g. "main"

  // Target
  environment: Environment;
  targetCIIds: string[];             // Servers/clusters this lands on

  // Lifecycle
  status: DeploymentStatus;
  strategy: DeploymentStrategy;
  trigger: DeploymentTrigger;
  triggeredById: string;             // user id (or 'system' for auto)
  triggeredByName: string;

  // Linkage to upstream
  linkedReleaseId?: string;
  linkedReleasePublicId?: string;
  linkedChangeId?: string;
  linkedChangePublicId?: string;

  // Stages (k8s-style execution)
  stages: DeploymentStage[];
  currentStageIndex: number;

  // Timing
  scheduledFor?: string;             // ISO; for pending deployments
  startedAt?: string;
  completedAt?: string;
  durationSec?: number;              // Total duration for finished deployments

  // Health post-deploy
  postDeployHealth: 'pending' | 'healthy' | 'degraded' | 'failed';
  healthCheckedAt?: string;

  // Rollback info (when status=rolled_back or rolling_back)
  rollback?: {
    initiatedAt: string;
    initiatedBy: string;
    reason: string;
    rolledBackToDeploymentId?: string;
    completedAt?: string;
  };

  // Triggered incidents (deployment-caused incidents)
  triggeredIncidentIds: string[];    // INC-XXX

  // Metadata
  pipelineRunId?: string;            // External CI/CD run ID
  pipelineUrl?: string;              // External URL to CI/CD run
  configHash?: string;               // For idempotency
  manifestRef?: string;              // k8s manifest ref

  // Tags
  tags: string[];

  createdAt: string;
  updatedAt: string;
}

export interface DeploymentStage {
  id: string;
  name: string;                      // e.g. "Pull image", "Apply manifests", "Wait for ready", "Smoke tests"
  type: 'preparation' | 'apply' | 'verification' | 'finalization';
  status: DeploymentStageStatus;
  startedAt?: string;
  completedAt?: string;
  durationSec?: number;
  // Progress (for active stages)
  progressPercent?: number;          // 0-100; undefined for indeterminate
  progressLabel?: string;            // e.g. "Updated 3 of 5 pods"
  // Output / results
  exitCode?: number;
  errorMessage?: string;
  warningCount?: number;
}

// === DEPLOYMENT LOG ENTRY ===
export interface DeploymentLogEntry {
  id: string;
  deploymentId: string;
  stageId?: string;                  // Which stage emitted this
  timestamp: string;                 // ISO with millisecond precision
  level: LogLevel;
  source: string;                    // e.g. "kubectl", "helm", "github-actions", "smoke-test"
  message: string;
  // Structured fields
  fields?: Record<string, string | number | boolean>;
  // For errors
  stackTrace?: string;
}

// === ENVIRONMENT INFO ===
export interface EnvironmentInfo {
  id: string;
  name: Environment;
  displayName: string;               // e.g. "Production", "Staging"
  description?: string;
  // Health
  health: 'healthy' | 'degraded' | 'down';
  uptime30d: number;                 // %
  // Active deployments
  activeDeploymentIds: string[];     // running or pending
  // Recent deployments
  recentDeploymentCount24h: number;
  recentDeploymentCount7d: number;
  failureRate7d: number;             // % of recent deploys that failed
  // Components currently running with versions
  runningComponents: Array<{
    componentName: string;
    componentCIPublicId?: string;
    currentVersion: string;
    deployedAt: string;
    lastDeploymentId: string;
  }>;
  // CIs in this env
  ciCount: number;
  // Restrictions
  freezeWindowActive: boolean;
  freezeWindowReason?: string;
  // Configuration
  approvalRequired: boolean;
}
```

## 🧩 DOMAIN TYPES (`src/types/testing.ts`)

```typescript
// Test plan types
export type TestPlanType =
  | 'release'             // For a specific release
  | 'regression'          // Regression suite
  | 'smoke'               // Quick post-deploy smoke test
  | 'load'                // Load/performance test
  | 'security'            // Security scan
  | 'compliance';         // Compliance check

export type TestPlanStatus = 'draft' | 'active' | 'archived';

// Test case
export type TestCaseType =
  | 'functional'
  | 'integration'
  | 'smoke'
  | 'performance'
  | 'security'
  | 'manual';             // Manual verification

export type TestCasePriority = 'p0' | 'p1' | 'p2' | 'p3';
export type TestCaseStatus = 'active' | 'archived' | 'flaky';

// Test run
export type TestRunStatus =
  | 'pending'             // Queued
  | 'running'             // Executing
  | 'passed'              // All tests passed
  | 'failed'              // At least one test failed
  | 'partial'             // Some passed, some failed (e.g. flaky)
  | 'cancelled'
  | 'timed_out';

export type TestStepResultStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

// Sign-off
export type SignOffStatus = 'pending' | 'approved' | 'rejected' | 'expired';
export type SignOffType = 'release_validation' | 'change_validation' | 'security_scan' | 'compliance_check';

// === TEST PLAN ===
export interface TestPlan {
  id: string;
  publicId: string;                  // e.g. "TST-PLAN-2026-00012"
  name: string;
  description?: string;
  type: TestPlanType;
  status: TestPlanStatus;

  // Scope
  componentName?: string;
  affectedCIIds: string[];
  linkedReleaseIds: string[];        // Releases this plan validates
  linkedChangeIds: string[];

  // Composition
  testCaseIds: string[];             // Cases included in this plan
  caseCount: number;                 // Denormalized

  // Execution config
  estimatedDurationMin: number;
  requiredEnvironment: Environment[];
  prerequisites: string[];           // Free text list

  // Stats
  lastRunAt?: string;
  lastRunStatus?: TestRunStatus;
  totalRuns: number;
  passRate30d: number;               // 0-1

  // Ownership
  ownerId: string;
  ownerName: string;
  ownerTeamId: string;

  // Tags
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// === TEST CASE ===
export interface TestCase {
  id: string;
  publicId: string;                  // e.g. "TST-CASE-2026-00451"
  title: string;
  description: string;
  type: TestCaseType;
  priority: TestCasePriority;
  status: TestCaseStatus;

  // Test details
  preconditions: string;             // Markdown
  steps: Array<{
    stepNumber: number;
    action: string;
    expectedResult: string;
  }>;
  postconditions?: string;

  // Automation
  isAutomated: boolean;
  automationFramework?: string;      // e.g. "Playwright", "JUnit", "k6"
  automationRef?: string;            // Path or test ID in repo

  // Linkage
  affectedCIIds: string[];
  linkedRequirementIds: string[];    // Free-form requirement IDs
  containedInPlans: string[];        // TestPlan publicIds

  // Stats
  executionCount: number;
  failureCount: number;
  flakeRate?: number;                // 0-1
  lastExecutedAt?: string;
  lastResult?: TestStepResultStatus;
  averageDurationSec?: number;

  // Ownership
  ownerId: string;
  ownerName: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// === TEST RUN ===
export interface TestRun {
  id: string;
  publicId: string;                  // e.g. "TST-RUN-2026-04812"
  testPlanId: string;
  testPlanPublicId: string;
  testPlanName: string;              // Denormalized

  status: TestRunStatus;

  // Execution context
  triggeredById: string;
  triggeredByName: string;
  triggeredBy: 'manual' | 'cicd' | 'scheduled' | 'pre_deployment' | 'post_deployment';
  environment: Environment;
  // Linkage
  linkedDeploymentId?: string;
  linkedDeploymentPublicId?: string;
  linkedReleasePublicId?: string;

  // Timing
  startedAt?: string;
  completedAt?: string;
  durationSec?: number;
  estimatedDurationMin: number;

  // Results
  totalCases: number;
  passedCount: number;
  failedCount: number;
  skippedCount: number;
  pendingCount: number;              // Still running
  passRate: number;                  // 0-1

  // Per-case results
  caseResults: TestRunCaseResult[];

  // Failure summary
  topFailures?: Array<{
    casePublicId: string;
    title: string;
    failureMessage: string;
    isFlaky: boolean;
  }>;

  // Run metadata
  pipelineRunId?: string;
  pipelineUrl?: string;
  artifactRef?: string;              // Test artifacts archive

  tags: string[];
  createdAt: string;
}

export interface TestRunCaseResult {
  id: string;
  testCaseId: string;
  testCasePublicId: string;
  testCaseTitle: string;
  status: TestStepResultStatus;
  durationSec: number;
  message?: string;                  // For failures
  errorTrace?: string;
  isFlaky?: boolean;                 // Detected as flaky
  retryCount: number;
}

// === SIGN-OFF ===
export interface SignOff {
  id: string;
  publicId: string;                  // e.g. "SGN-2026-00041"
  type: SignOffType;
  status: SignOffStatus;
  title: string;                     // Brief summary

  // Subject
  subjectType: 'release' | 'change' | 'incident_pir';
  subjectId: string;                 // Internal ID
  subjectPublicId: string;           // e.g. "REL-2026-00018"
  subjectTitle: string;              // Denormalized

  // Validation evidence
  testRunIds: string[];              // Test runs that support this sign-off
  testRunSummary: {
    totalRuns: number;
    passedRuns: number;
    failedRuns: number;
  };

  // Approval
  requestedById: string;
  requestedByName: string;
  requestedAt: string;
  approverId: string;                // Who needs to approve
  approverName: string;
  approverRole: string;
  decidedAt?: string;
  decision?: 'approved' | 'rejected';
  decisionNote?: string;

  // SLA
  dueAt: string;                     // When approval is needed by
  slaBreached: boolean;

  createdAt: string;
  updatedAt: string;
}
```

In `src/types/index.ts`:
```typescript
export * from './deployment';
export * from './testing';
```

---

## 🗄 MOCK DATA

### `src/mocks/deployments.ts` — 20 deployments

**Distribution:**
- Status: pending=2, running=2 (one is the dramatic showcase), success=11, failed=2, rolled_back=2, cancelled=1
- Environment: development=8, staging=7, production=5
- Spread across last 30 days (most recent at top)
- Strategy mix: rolling (15), blue_green (2), canary (2), big_bang (1)
- Trigger mix: cicd_pipeline (12), manual (5), auto_promotion (3)

**Showcase deployments** (must include):

```
DEP-2026-00342 (THE SHOWCASE — currently RUNNING)
  Component: payment-api
  artifactRef: 'registry.acme.io/payment-api:2.4.1'
  commitSha: '7e3f9a2'
  commitMessage: 'feat: pgbouncer integration + connection leak fix'
  branch: 'main'
  Environment: staging
  Status: running
  Strategy: rolling
  Trigger: cicd_pipeline
  triggeredByName: 'github-actions'
  linkedReleasePublicId: REL-2026-00020
  linkedChangePublicId: CHG-2026-00091
  startedAt: 2026-05-08T08:35:00Z (just started ~7 minutes ago)
  currentStageIndex: 2 (Apply manifests stage)
  stages: [
    { id: 's1', name: 'Pull image',           type: 'preparation',  status: 'success', durationSec: 45 },
    { id: 's2', name: 'Pre-deploy validation',type: 'preparation',  status: 'success', durationSec: 12 },
    { id: 's3', name: 'Apply manifests',      type: 'apply',        status: 'running',
                                                                    progressPercent: 60,
                                                                    progressLabel: 'Updated 3 of 5 pods',
                                                                    startedAt: 2026-05-08T08:36:30Z },
    { id: 's4', name: 'Wait for rollout',     type: 'apply',        status: 'pending' },
    { id: 's5', name: 'Smoke tests',          type: 'verification', status: 'pending' },
    { id: 's6', name: 'Health check',         type: 'verification', status: 'pending' },
    { id: 's7', name: 'Update deployment record', type: 'finalization', status: 'pending' },
  ]
  postDeployHealth: 'pending'
  pipelineRunId: '7892341'
  pipelineUrl: 'github.com/acme-corp/payment-api/actions/runs/7892341'
  manifestRef: 'k8s/payment-api/staging/deployment.yaml'
  triggeredIncidentIds: []
  tags: [staging, payment, pgbouncer, rolling]
  targetCIIds: [CI-APP-PAY-001]

DEP-2026-00341 — Same release REL-020, dev environment, success (just before staging)
  Component: payment-api 2.4.1
  Environment: development
  Status: success
  startedAt: 2026-05-08T08:20:00Z, completedAt: 2026-05-08T08:32:00Z
  durationSec: 720
  postDeployHealth: 'healthy'

DEP-2026-00340 — auth-service 3.1.0 deploy to staging (in_validation in REL-019)
  Component: auth-service 3.1.0
  Environment: staging
  Status: success (5min ago)
  linkedReleasePublicId: REL-2026-00019

DEP-2026-00338 — order-api 3.1.0 deploy to staging (REL-018, ready)
  Component: order-api 3.1.0
  Environment: staging
  Status: success (45min ago)
  linkedReleasePublicId: REL-2026-00018

DEP-2026-00335 — notification-gw 1.5.2 deploy to PRODUCTION (REL-016 released 24h ago)
  Component: notification-gw 1.5.2
  Environment: production
  Status: success (24h ago)
  durationSec: 285
  linkedReleasePublicId: REL-2026-00016

DEP-2026-00328 — search-service 4.2.0 deploy to PRODUCTION → ROLLED BACK (REL-014)
  Status: rolled_back (5d ago)
  rollback: {
    initiatedAt: 2026-05-03T14:22:00Z,
    initiatedBy: 'u-008',
    reason: 'Search latency p95 spiked 3x baseline post-deploy. Critical issue with new query planner.',
    rolledBackToDeploymentId: 'DEP-2026-00318',
    completedAt: 2026-05-03T14:38:00Z,
  }
  triggeredIncidentIds: ['INC-2026-00148']  (causing 5d ago incident)
  linkedReleasePublicId: REL-2026-00014

DEP-2026-00322 — analytics-pipeline 2.0.0 deploy → FAILED (the failed Kafka migration from CHG-080)
  Status: failed (3 weeks ago)
  stages: [..., { name: 'Wait for rollout', status: 'failed', errorMessage: 'Pods crashlooping with ConsumerGroupRebalanceError' }]
  triggeredIncidentIds: ['INC-2026-00170']
  linkedReleasePublicId: REL-2026-00013

DEP-2026-00343 — payment-api 2.4.1 deploy to PRODUCTION (PENDING, scheduled)
  Status: pending
  scheduledFor: 2026-05-10T14:00:00Z (matches CHG-091 implementation window)
  Environment: production
  linkedReleasePublicId: REL-2026-00020
  linkedChangePublicId: CHG-2026-00091
```

Generate the remaining ~12 deployments with diverse components:
- Multiple deploys to dev (various components, mostly success)
- Some failed cancelled deployments (e.g. CI test failure cancelled deploy before it started)
- A canary deployment that got promoted (trigger: auto_promotion)
- A blue/green deployment for auth-service

**Each deployment** must have:
- Realistic stages array (5-7 stages depending on strategy)
- Times that make sense (started < completed)
- For rolling/successful, durationSec ~120-600s
- Tags appropriate to env + component

Helpers:
```typescript
export const getDeploymentById = (id: string) => mockDeployments.find(d => d.id === id || d.publicId === id);
export const getActiveDeployments = () => mockDeployments.filter(d => ['pending','running','rolling_back'].includes(d.status));
export const getDeploymentsByEnv = (env: Environment) => mockDeployments.filter(d => d.environment === env);
export const getDeploymentsByRelease = (releaseId: string) => mockDeployments.filter(d => d.linkedReleaseId === releaseId || d.linkedReleasePublicId === releaseId);
export const getRecentDeployments = (env: Environment, hours: number) => { /* ... */ };
```

### `src/mocks/deploymentLogs.ts` — log entries for active deployment

For DEP-2026-00342 (the running showcase), generate ~80 log entries spanning the deployment timeline. Mix of levels (mostly info, few warn, no errors yet — it's still running successfully).

**Sample entries** (showcase the variety):

```typescript
[
  { timestamp: '2026-05-08T08:35:00.012Z', level: 'info',  source: 'github-actions', stageId: 's1', message: 'Workflow triggered by push to main (commit 7e3f9a2)' },
  { timestamp: '2026-05-08T08:35:01.245Z', level: 'info',  source: 'github-actions', stageId: 's1', message: 'Setting up build environment...' },
  { timestamp: '2026-05-08T08:35:08.880Z', level: 'info',  source: 'docker',         stageId: 's1', message: 'Pulling registry.acme.io/payment-api:2.4.1', fields: { image_size_mb: 142 } },
  { timestamp: '2026-05-08T08:35:42.103Z', level: 'info',  source: 'docker',         stageId: 's1', message: 'Image pulled successfully (digest: sha256:a3f9e2b1c4d5...)' },
  { timestamp: '2026-05-08T08:35:43.000Z', level: 'info',  source: 'kubectl',        stageId: 's2', message: 'Validating deployment manifest...' },
  { timestamp: '2026-05-08T08:35:43.812Z', level: 'info',  source: 'kubectl',        stageId: 's2', message: 'Manifest valid. Verifying RBAC...' },
  { timestamp: '2026-05-08T08:35:55.401Z', level: 'info',  source: 'kubectl',        stageId: 's2', message: 'Pre-flight checks passed' },
  { timestamp: '2026-05-08T08:36:00.000Z', level: 'info',  source: 'helm',           stageId: 's2', message: 'Pre-deploy hook: backup current configmap' },
  { timestamp: '2026-05-08T08:36:12.300Z', level: 'info',  source: 'helm',           stageId: 's2', message: 'Pre-deploy hook completed' },
  { timestamp: '2026-05-08T08:36:30.000Z', level: 'info',  source: 'kubectl',        stageId: 's3', message: 'Applying manifests to staging namespace' },
  { timestamp: '2026-05-08T08:36:31.045Z', level: 'info',  source: 'kubectl',        stageId: 's3', message: 'deployment.apps/payment-api configured' },
  { timestamp: '2026-05-08T08:36:32.118Z', level: 'info',  source: 'kubectl',        stageId: 's3', message: 'Rolling update strategy: maxSurge=1 maxUnavailable=0' },
  { timestamp: '2026-05-08T08:36:48.220Z', level: 'info',  source: 'kubectl',        stageId: 's3', message: 'New pod payment-api-7d8f9-x4n2j scheduled', fields: { node: 'eks-staging-node-3' } },
  { timestamp: '2026-05-08T08:37:02.401Z', level: 'info',  source: 'kubectl',        stageId: 's3', message: 'Pod payment-api-7d8f9-x4n2j: container image pulling' },
  { timestamp: '2026-05-08T08:37:18.789Z', level: 'info',  source: 'kubectl',        stageId: 's3', message: 'Pod payment-api-7d8f9-x4n2j: started successfully' },
  { timestamp: '2026-05-08T08:37:25.030Z', level: 'info',  source: 'kubectl',        stageId: 's3', message: 'Readiness probe passed for pod 1/5' },
  { timestamp: '2026-05-08T08:37:30.005Z', level: 'info',  source: 'kubectl',        stageId: 's3', message: 'Old pod payment-api-6c5d2-r8k9p terminated' },
  { timestamp: '2026-05-08T08:37:42.117Z', level: 'info',  source: 'kubectl',        stageId: 's3', message: 'New pod payment-api-7d8f9-pq3hm scheduled' },
  { timestamp: '2026-05-08T08:38:01.222Z', level: 'info',  source: 'kubectl',        stageId: 's3', message: 'Readiness probe passed for pod 2/5' },
  { timestamp: '2026-05-08T08:38:03.401Z', level: 'warn',  source: 'kubectl',        stageId: 's3', message: 'Init container slow startup detected (8.2s)', fields: { pod: 'payment-api-7d8f9-pq3hm' } },
  { timestamp: '2026-05-08T08:38:12.011Z', level: 'info',  source: 'pgbouncer-init', stageId: 's3', message: 'pgbouncer connection test successful' },
  { timestamp: '2026-05-08T08:38:18.700Z', level: 'info',  source: 'kubectl',        stageId: 's3', message: 'Old pod payment-api-6c5d2-w7n4d terminated' },
  { timestamp: '2026-05-08T08:38:35.080Z', level: 'info',  source: 'kubectl',        stageId: 's3', message: 'New pod payment-api-7d8f9-zk5fx scheduled' },
  { timestamp: '2026-05-08T08:38:55.402Z', level: 'info',  source: 'kubectl',        stageId: 's3', message: 'Readiness probe passed for pod 3/5' },
  // (continues — generate ~80 total entries showing realistic deploy flow)
  { timestamp: '2026-05-08T08:42:00.000Z', level: 'info',  source: 'orchestrator',   stageId: 's3', message: 'Rolling update progress: 3 of 5 pods updated (60%)' },
]
```

For other deployments, generate fewer logs (5-15 each) to keep file size manageable. Failed deployments should have logs ending with error entries showing the failure reason.

### `src/mocks/environments.ts` — 3 environments

```typescript
export const mockEnvironments: EnvironmentInfo[] = [
  {
    id: 'env-dev',
    name: 'development',
    displayName: 'Development',
    description: 'Shared development environment for all services',
    health: 'healthy',
    uptime30d: 99.7,
    activeDeploymentIds: [],  // none currently
    recentDeploymentCount24h: 12,
    recentDeploymentCount7d: 67,
    failureRate7d: 0.06,  // 6% failure
    runningComponents: [
      { componentName: 'payment-api', currentVersion: '2.4.1', deployedAt: '2026-05-08T08:32:00Z', lastDeploymentId: 'DEP-2026-00341', componentCIPublicId: 'CI-APP-PAY-001' },
      { componentName: 'auth-service', currentVersion: '3.1.0', deployedAt: '2026-05-08T07:15:00Z', lastDeploymentId: 'DEP-2026-00337' },
      { componentName: 'order-api', currentVersion: '3.1.0', deployedAt: '2026-05-08T06:42:00Z', lastDeploymentId: 'DEP-2026-00336' },
      // ... etc for all components
    ],
    ciCount: 12,
    freezeWindowActive: false,
    approvalRequired: false,
  },
  {
    id: 'env-staging',
    name: 'staging',
    displayName: 'Staging',
    description: 'Pre-production environment, mirrors production data shape',
    health: 'healthy',
    uptime30d: 99.5,
    activeDeploymentIds: ['DEP-2026-00342'],  // the running showcase
    recentDeploymentCount24h: 8,
    recentDeploymentCount7d: 42,
    failureRate7d: 0.02,
    runningComponents: [
      { componentName: 'payment-api', currentVersion: '2.4.0', deployedAt: '2026-05-01T10:00:00Z', lastDeploymentId: 'DEP-...' },  // 2.4.1 still rolling
      { componentName: 'auth-service', currentVersion: '3.1.0', deployedAt: '2026-05-08T08:30:00Z', lastDeploymentId: 'DEP-2026-00340' },
      { componentName: 'order-api', currentVersion: '3.1.0', deployedAt: '2026-05-08T07:55:00Z', lastDeploymentId: 'DEP-2026-00338' },
      // ...
    ],
    ciCount: 14,
    freezeWindowActive: false,
    approvalRequired: false,
  },
  {
    id: 'env-prod',
    name: 'production',
    displayName: 'Production',
    description: 'Live customer-facing environment',
    health: 'degraded',  // matches Doc 0 dashboard - Order Service degraded
    uptime30d: 99.91,
    activeDeploymentIds: [],
    recentDeploymentCount24h: 2,
    recentDeploymentCount7d: 11,
    failureRate7d: 0.18,  // higher % due to recent rollback
    runningComponents: [
      { componentName: 'payment-api', currentVersion: '2.4.0', deployedAt: '2026-04-24T14:00:00Z', lastDeploymentId: 'DEP-...' },
      { componentName: 'auth-service', currentVersion: '2.8.1', deployedAt: '2026-05-01T18:00:00Z', lastDeploymentId: 'DEP-...' },
      { componentName: 'order-api', currentVersion: '3.0.5', deployedAt: '2026-04-29T10:00:00Z', lastDeploymentId: 'DEP-...' },
      { componentName: 'notification-gw', currentVersion: '1.5.2', deployedAt: '2026-05-07T20:11:00Z', lastDeploymentId: 'DEP-2026-00335' },
      { componentName: 'search-service', currentVersion: '4.1.5', deployedAt: '2026-05-03T14:38:00Z', lastDeploymentId: 'DEP-2026-00318' },  // post-rollback version
      // ...
    ],
    ciCount: 22,
    freezeWindowActive: true,
    freezeWindowReason: 'Marketing campaign freeze May 9-11, 2026',
    approvalRequired: true,
  },
];
```

### `src/mocks/testPlans.ts` — 10 test plans

```
TST-PLAN-2026-00012  payment-api pgbouncer regression suite
  Type: regression
  Status: active
  Component: payment-api
  caseCount: 24
  estimatedDurationMin: 18
  Owner: u-005 (Yuki Tanaka)
  linkedReleaseIds: [REL-2026-00020]
  passRate30d: 0.96

TST-PLAN-2026-00010  payment-api smoke test
  Type: smoke
  caseCount: 6
  estimatedDurationMin: 3
  passRate30d: 0.99

TST-PLAN-2026-00008  auth-service 3.x integration suite
  Type: regression
  caseCount: 32
  estimatedDurationMin: 25
  linkedReleaseIds: [REL-2026-00019]
  passRate30d: 0.94

TST-PLAN-2026-00007  order-checkout end-to-end flow
  Type: regression
  caseCount: 18
  estimatedDurationMin: 12
  linkedReleaseIds: [REL-2026-00018]
  passRate30d: 0.92

TST-PLAN-2026-00009  Payment Service load test (10x traffic)
  Type: load
  caseCount: 5
  estimatedDurationMin: 45
  passRate30d: 0.80

TST-PLAN-2026-00006  PCI-DSS compliance check
  Type: compliance
  caseCount: 14
  estimatedDurationMin: 8
  passRate30d: 1.00

TST-PLAN-2026-00005  Security scan — payment-api
  Type: security
  caseCount: 9
  estimatedDurationMin: 15
  passRate30d: 0.95

TST-PLAN-2026-00004  search-service indexing tests
  Type: regression
  Status: active
  caseCount: 16

TST-PLAN-2026-00003  notification-gw delivery tests
  Type: smoke
  caseCount: 8

TST-PLAN-2026-00002  cross-service auth boundary tests
  Type: integration
  caseCount: 12
```

### `src/mocks/testCases.ts` — 30 cases (sample showing variety)

For each plan, 6-32 cases. Generate ~30 cases total covering different types and priorities.

**Showcase cases for TST-PLAN-2026-00012:**

```
TST-CASE-2026-00451  Verify pgbouncer connection pooling under peak load
  Type: performance, Priority: p0
  Plan: TST-PLAN-2026-00012
  Steps: [
    { stepNumber: 1, action: 'Generate 800 RPS load on /checkout endpoint', expectedResult: 'Load generation tool reports stable 800 RPS' },
    { stepNumber: 2, action: 'Monitor pgbouncer connection pool stats', expectedResult: 'Active connections stay below 50 (pool size)' },
    { stepNumber: 3, action: 'Check application error rate', expectedResult: 'Error rate < 0.1%' },
    { stepNumber: 4, action: 'Check p95 latency', expectedResult: 'p95 < 300ms' },
  ]
  isAutomated: true
  automationFramework: 'k6'
  flakeRate: 0.05

TST-CASE-2026-00452  Verify graceful connection drain during rolling restart
  Type: integration, Priority: p0
  isAutomated: true
  automationFramework: 'Playwright'

TST-CASE-2026-00453  Verify connection retry logic after pgbouncer restart
  Type: integration, Priority: p1

TST-CASE-2026-00454  Verify metric exporter for pgbouncer connection counts
  Type: functional, Priority: p2
  isAutomated: true

TST-CASE-2026-00450  Verify checkout flow end-to-end with all dependencies
  Type: smoke, Priority: p0

TST-CASE-2026-00455  Manual: visual confirmation of payment confirmation page
  Type: manual, Priority: p1
  isAutomated: false

TST-CASE-2026-00499  Verify SSO redirect flow EU region
  Type: integration, Priority: p0
  Plan: TST-PLAN-2026-00008

// ... etc, ~30 cases total
```

Each case populated with realistic preconditions, postconditions, and 3-7 steps each.

### `src/mocks/testRuns.ts` — 10 test runs

```
TST-RUN-2026-04812 — Currently RUNNING (showcase)
  testPlanPublicId: TST-PLAN-2026-00012
  testPlanName: payment-api pgbouncer regression suite
  Status: running
  triggeredBy: pre_deployment (linked to DEP-2026-00342)
  Environment: staging
  startedAt: 2026-05-08T08:36:00Z
  totalCases: 24
  passedCount: 16
  failedCount: 0
  skippedCount: 0
  pendingCount: 8
  passRate: 0
  caseResults: [/* 16 passed + 8 pending populated */]

TST-RUN-2026-04811 — Recent failed run (relevant to demo)
  testPlanPublicId: TST-PLAN-2026-00009
  testPlanName: Payment Service load test
  Status: partial (had flaky tests)
  triggeredBy: scheduled
  Environment: staging
  completedAt: 2026-05-08T06:00:00Z
  durationSec: 2580
  totalCases: 5
  passedCount: 4
  failedCount: 1
  skippedCount: 0
  passRate: 0.8
  topFailures: [
    { casePublicId: 'TST-CASE-2026-00478', title: 'Sustained 10x traffic for 30min', failureMessage: 'p95 latency exceeded SLO at minute 22 (582ms vs 500ms target)', isFlaky: true },
  ]

TST-RUN-2026-04810 — Successful auth-service test run (REL-019 staging)
  Status: passed (this is what allowed REL-019 to advance)
  passedCount: 32, totalCases: 32

TST-RUN-2026-04809 — order-api test run for REL-018
  Status: passed
  totalCases: 18, passedCount: 18

TST-RUN-2026-04805 — search-service deployment test that FAILED → caused rollback
  Status: failed (5 days ago, related to REL-014 rollback)
  Environment: production (post-deploy validation)
  topFailures: [
    { casePublicId: 'TST-CASE-2026-00410', title: 'Search query latency p95 < 200ms', failureMessage: 'p95 was 612ms, 3x baseline', isFlaky: false },
  ]

TST-RUN-2026-04800 — Historical successful runs (5 more, varied dates)
TST-RUN-2026-04795
TST-RUN-2026-04790
TST-RUN-2026-04785
TST-RUN-2026-04780
```

For showcase TST-RUN-2026-04812, populate `caseResults` array with 24 entries:
- 16 with status `passed` (with realistic durationSec 2-30s)
- 8 with status `pending` (will be filled as tests "run")

### `src/mocks/signOffs.ts` — 4 sign-off items

```
SGN-2026-00041 — REL-2026-00018 order-api 3.1.0 production sign-off
  Type: release_validation
  Status: pending
  Subject: REL-2026-00018 order-api 3.1.0
  testRunIds: [TST-RUN-2026-04809]
  testRunSummary: { totalRuns: 1, passedRuns: 1, failedRuns: 0 }
  approverId: u-006 (Helena Vasquez)
  approverRole: Release Manager
  requestedAt: 2026-05-08T07:55:00Z
  dueAt: 2026-05-09T18:00:00Z

SGN-2026-00040 — CHG-2026-00091 pgbouncer migration validation
  Type: change_validation
  Status: pending (waiting for staging deploy + tests to complete)
  Subject: CHG-2026-00091
  testRunIds: [TST-RUN-2026-04812]  (currently running)
  approverId: u-007 (Tom Bergstrom, Service Owner Payment)
  dueAt: 2026-05-09T17:00:00Z

SGN-2026-00039 — REL-2026-00017 auth-service 2.8.1 PIR sign-off
  Type: release_validation
  Status: pending
  Subject: REL-2026-00017 (released 7d ago, still awaiting PIR sign-off)
  approverId: u-001 (Sarah Chen)
  dueAt: 2026-05-10T18:00:00Z
  (matches Doc 0 inbox ibx-007)

SGN-2026-00038 — Q2 PCI-DSS compliance attestation
  Type: compliance_check
  Status: approved (last week)
  decidedAt: 2026-05-01T15:00:00Z
  decision: approved
  approverId: u-001
```

Helpers:
```typescript
export const getActiveSignOffs = () => mockSignOffs.filter(s => s.status === 'pending');
export const getMyPendingSignOffs = (userId: string) => mockSignOffs.filter(s => s.status === 'pending' && s.approverId === userId);
```

---

## 📄 PAGE 4b.1 — Deployments Queue

**File:** `src/routes/deployments/DeploymentsQueue.tsx`
**Route:** `/deployments`

### Page header

```
Deployments
20 total · 2 active · 1 pending · 11 success · 2 failed (last 30 days)
                                              [Environments →]   [+ Manual deploy]
```

- Right side: link to `/environments` + `[+ Manual deploy]` opens modal (visual only — would create new deployment)

### Active deployments banner (when running)

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🚀 1 deployment in progress                                          │
│                                                                       │
│ DEP-2026-00342  payment-api 2.4.1 → staging                          │
│ Stage 3 of 7: Apply manifests · 60% complete · 7m 12s elapsed        │
│                                              [View live →]            │
└─────────────────────────────────────────────────────────────────────┘
```

Animated progress bar fills in primary color. Click "View live →" navigates to detail page.

### Filter bar

```
[🔍 Search ID, component, commit...]   [Status ▾]  [Environment ▾]  [Component ▾]  [Strategy ▾]  [Trigger ▾]   [Reset]
```

Status filter shows badge counts.

### Quick filter chips

```
[🔥 Active (2)]  [⚠ Failed (2)]  [↩ Rolled back (2)]  [📡 Last 24h (8)]  [Production only (5)]
```

### Deployments table (DataTable)

Dense, queue-style. Columns: `Status | Public ID | Component | Version | Environment | Strategy | Trigger | Started | Duration | Actions`

- **Status**: status pill with animated dot for `running`/`rolling_back`
- **Public ID**: mono font, links to `/deployments/{publicId}`
- **Component**: truncate with tooltip
- **Version**: mono (e.g. "2.4.1")
- **Environment**: env chip with env-specific color (dev=gray, staging=blue, prod=red)
- **Strategy**: small chip
- **Trigger**: trigger source chip with icon
- **Started**: relative time, or "Scheduled" with future date for pending
- **Duration**: total duration if completed; "running 7m 12s" with live increment if active
- **Actions**: `⋮` menu — Open, View logs, Rollback (only for success/running deployments), Cancel (for pending/running), Re-deploy

For the showcase running deployment (DEP-2026-00342), row should have subtle blue tint background to indicate active.

For rolled_back deployments, row shows a small `↩` badge before publicId.

For deployments with `triggeredIncidentIds.length > 0`, show a small `⚠ caused incident` chip after status.

Default sort: by `startedAt` desc (most recent first).
Bulk actions: View logs (multi), Cancel selected (for pending only).

### Empty states

If filtered to nothing: "No deployments match. [Reset filters]"
If no deployments: "No deployments yet."

---

## 📄 PAGE 4b.2 — Deployment Detail (Dramatic Live View)

**File:** `src/routes/deployments/DeploymentDetail.tsx`
**Route:** `/deployments/:deploymentId`

### Purpose
**Showcase page.** Live, dramatic view for in-progress deployments. Datadog/GitHub Actions hybrid feel.

### Layout: hero header + 2-column main + sticky bottom action

### Hero header (different background based on status)

For RUNNING (showcase):

```
[← Deployments]                                                  [⋮ Actions]
─────────────────────────────────────────────────────────────────────────

🚀 DEPLOYMENT IN PROGRESS                  [● LIVE]      [Rollback] [Cancel]

DEP-2026-00342
payment-api  2.4.1 → staging

  Triggered by  github-actions (cicd_pipeline)
  Started       7m 12s ago · 2026-05-08 08:35 UTC
  Strategy      rolling
  Linked to     REL-2026-00020 · CHG-2026-00091
  Commit        7e3f9a2  "feat: pgbouncer integration + connection leak fix"

  Overall progress
  ████████████████░░░░░░░░░░░░░░░░░░░░░░░ 43%
  Stage 3 of 7: Apply manifests · 60% complete · ETA ~5 min
```

Hero background: subtle blue gradient when running, green when success, red when failed, amber when rolled_back.
"● LIVE" pulsing dot for running.
`[Rollback]` is a prominent red button (large, ~40px), only visible for `running`/`success` statuses. Triggers confirmation modal before action.

For SUCCESS:

```
✓ DEPLOYED SUCCESSFULLY                                          [Rollback]

DEP-2026-00335
notification-gw  1.5.2 → production

  Completed     1d ago · 2026-05-07 20:11 UTC
  Duration      4m 45s
  Health        ● Healthy (verified 1d ago)
  Triggered by  github-actions
```

For FAILED:

```
✗ DEPLOYMENT FAILED                                       [View logs] [Re-deploy]

DEP-2026-00322
analytics-pipeline  2.0.0 → staging

  Failed at     Wait for rollout (stage 4 of 7)
  Failed 3 weeks ago · Duration 1m 12s before failure
  Triggered    INC-2026-00170
  Error        "Pods crashlooping with ConsumerGroupRebalanceError"
```

### Main: 2-column split

**Left (60%) — Stages visualization (k8s-style):**

Vertical pipeline of stages, large nodes, clickable to expand.

```
DEPLOYMENT STAGES

╔═════════════════════════════════════════════════╗
║ ✓  Pull image                              45s ║
║    completed at 08:35:42                         ║
║    Image registry.acme.io/payment-api:2.4.1     ║
║    digest: sha256:a3f9e2b1c4d5...               ║
╚═════════════════════════════════════════════════╝
                       │
                       ▼
╔═════════════════════════════════════════════════╗
║ ✓  Pre-deploy validation                   12s ║
║    completed at 08:35:55                         ║
║    Manifest valid · RBAC verified · Pre-deploy  ║
║    hook completed                                ║
╚═════════════════════════════════════════════════╝
                       │
                       ▼
╔═════════════════════════════════════════════════╗
║ ◉  Apply manifests                          ⏱  ║
║    started 08:36:30 (6m 18s ago)                 ║
║                                                   ║
║    Rolling update progress:                      ║
║    ███████████████░░░░░░░ 60% — Pod 3 of 5      ║
║                                                   ║
║    Currently: deploying pod payment-api-7d8f9   ║
║    [View live logs ↓]                            ║
╚═════════════════════════════════════════════════╝
                       │ (greyed)
                       ▼
┌─────────────────────────────────────────────────┐
│ ○  Wait for rollout                              │
│    pending — will start when previous done      │
└─────────────────────────────────────────────────┘
                       │ (greyed)
                       ▼
┌─────────────────────────────────────────────────┐
│ ○  Smoke tests                                   │
│    pending                                        │
│    Will run: TST-PLAN-2026-00010 (6 cases, ~3m) │
└─────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│ ○  Health check                                  │
│    pending                                        │
└─────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│ ○  Update deployment record                      │
│    pending                                        │
└─────────────────────────────────────────────────┘
```

- Active stage: bordered in primary color, animated pulsing border, clear progress info
- Completed stages: green check, summarized info, durationSec
- Failed stage: red X, error message prominently shown
- Pending stages: gray, dim, "pending" label
- Skipped stages: muted strikethrough

For each stage, expand toggle reveals more detail (e.g., for "Apply manifests": list of pods being updated, kubectl commands run, output).

**Right (40%) — Logs panel:**

Datadog/Sentry-style live log stream:

```
┌─ LIVE LOGS ────────────────────────[● Streaming] [Pause] [⤓ Export] ─┐
│                                                                        │
│ [🔍 Search logs...]                                                    │
│                                                                        │
│ Filters:                                                               │
│ Level: [☑ All] [☑ info] [☑ warn] [☑ error] [☐ debug]                 │
│ Source: [All sources ▾]   Stage: [All stages ▾]                       │
│                                                                        │
│ ─────────────────────────────────────────────────────────────────     │
│ [scrollable log area, monospace, auto-scrolls to bottom]              │
│                                                                        │
│ 08:42:00.000 [info]  orchestrator    Rolling update progress: 3 of 5  │
│              pods updated (60%)                                        │
│                                                                        │
│ 08:38:55.402 [info]  kubectl         Readiness probe passed for pod   │
│              3/5                                                       │
│                                                                        │
│ 08:38:35.080 [info]  kubectl         New pod payment-api-7d8f9-zk5fx  │
│              scheduled                                                 │
│                                                                        │
│ 08:38:18.700 [info]  kubectl         Old pod terminated                │
│                                                                        │
│ 08:38:12.011 [info]  pgbouncer-init  pgbouncer connection test        │
│              successful                                                │
│                                                                        │
│ 08:38:03.401 [warn]  kubectl         Init container slow startup      │
│              detected (8.2s)                                           │
│              fields: { pod: 'payment-api-7d8f9-pq3hm' }              │
│                                                                        │
│ 08:38:01.222 [info]  kubectl         Readiness probe passed for pod   │
│              2/5                                                       │
│                                                                        │
│ ... (more entries scrolling)                                           │
│                                                                        │
│ ────                                                                   │
│ Showing 47 of 80 entries · [Load older]                               │
└────────────────────────────────────────────────────────────────────────┘
```

**Log entry visual:**
- Timestamp (mono, ms precision, color: primary)
- Level pill (info=neutral, warn=amber, error=red, debug=gray, fatal=dark red)
- Source (small chip)
- Message (full text, wrapped if long)
- Fields (collapsible, key=value pairs in mono)
- Stack trace (collapsible, shown for errors)

**Search:** filters entries real-time. Supports text match across message + fields.

**Filters:** level checkboxes (all on by default), source dropdown (showing all unique sources), stage dropdown.

**Streaming toggle:** when on, new entries auto-appear with subtle slide-in animation; auto-scrolls to bottom unless user scrolled up. Pause keeps view static.

**Export:** download as text file (visual only).

### Tabs (below main split, full-width)

```
[Overview]  [Manifest]  [Linked Items]  [Triggered Incidents (0)]  [History]
```

#### Overview tab

Detailed metadata table:

```
COMPONENT       payment-api
VERSION         2.4.1
ARTIFACT        registry.acme.io/payment-api:2.4.1
COMMIT          7e3f9a2 — "feat: pgbouncer integration + connection leak fix"
                Author: David Okafor · 2 hours ago
                [View on GitHub →]
BRANCH          main
TARGET CIs      CI-APP-PAY-001 → staging cluster
PIPELINE RUN    github.com/acme-corp/payment-api/actions/runs/7892341 →
MANIFEST        k8s/payment-api/staging/deployment.yaml
CONFIG HASH     a4f8e2b1
TAGS            staging · payment · pgbouncer · rolling
```

#### Manifest tab

Renders deployment manifest YAML with syntax highlighting (or simple monospace).

#### Linked Items tab

```
RELEASE
  REL-2026-00020 — payment-api 2.4.1 (planning)
  Stage: staging (this deployment)
  [Open release →]

CHANGE
  CHG-2026-00091 — Migrate payment-api to pgbouncer
  Status: in review
  [Open change →]

TEST RUN
  TST-RUN-2026-04812 — pgbouncer regression suite (running)
  16 of 24 passed · 8 pending
  [View test run →]

PROBLEM ADDRESSED
  PRB-2026-00018 — Recurring memory pressure on payment-api

INCIDENTS RESOLVED (when this completes)
  INC-2026-00184  Payment Service: 5xx error rate elevated (P1)
  INC-2026-00156  Payment Service total outage (P1)
  INC-2026-00132  Payment API timeouts during AM peak (P2)
  INC-2026-00098  Payment API 5xx errors during launch (P2)
```

#### Triggered Incidents tab

For DEP-2026-00342, empty (none yet).
For DEP-2026-00328 (search rollback), shows INC-2026-00148 with full incident card.

#### History tab

Audit log: trigger, stage transitions, log error highlights, rollback actions, etc.

### Sticky bottom action bar

When running:
```
─────────────────────────────────────────────────────────────────────────
Status: ◉ Running (43%)         ETA: ~5 min remaining          [Rollback]
```

When success:
```
Status: ✓ Success         Health: Healthy        [Re-deploy] [Rollback]
```

### Rollback flow

`[Rollback]` opens modal:
```
Rollback DEP-2026-00342                                            [×]

This will roll back payment-api 2.4.1 to the previous successful deployment
on staging (DEP-2026-00339, payment-api 2.4.0, deployed 7d ago).

  Reason for rollback *
  [                                                                  ]
  [                                                                  ]
  Min 30 chars; visible to all stakeholders.

  [✓] Notify stakeholders via Slack #payment-engineering
  [ ] Auto-create incident report

⚠ This action cannot be undone. Re-deploy 2.4.1 will be required to retry.

                                          [Cancel] [Confirm rollback]
```

After confirm: status changes to `rolling_back`, hero header turns amber, new stage "Rollback" added to bottom of stages with progress.

---

## 📄 PAGE 4b.3 — Environments

**File:** `src/routes/deployments/Environments.tsx`
**Route:** `/environments`

### Page header

```
Environments
3 environments · 1 deployment in progress · Production: ⬤ Degraded
                                                          [Last 7d ▾]
```

### Environment cards grid (3 cards in row, full-width)

Each environment is a tall card with rich info:

```
┌──────────────────────────┬──────────────────────────┬──────────────────────────┐
│ DEVELOPMENT              │ STAGING                  │ PRODUCTION               │
│                          │                          │                          │
│ ● Healthy                │ ● Healthy                │ ⬤ Degraded               │
│ Uptime 30d: 99.7%        │ Uptime 30d: 99.5%        │ Uptime 30d: 99.91%       │
│                          │                          │                          │
│ ─── Active deployments ──│─── Active deployments ──│─── Active deployments ──│
│                          │                          │                          │
│ None active              │ ◉ DEP-2026-00342         │ None active              │
│                          │   payment-api 2.4.1      │                          │
│                          │   60% · 7m elapsed       │                          │
│                          │   [View live →]          │                          │
│                          │                          │                          │
│ ─── Last 7 days ─────────│─── Last 7 days ─────────│─── Last 7 days ─────────│
│ 67 deployments           │ 42 deployments           │ 11 deployments           │
│ 6% failure rate          │ 2% failure rate          │ 18% failure rate         │
│ Avg duration 4m 12s      │ Avg duration 6m 30s      │ Avg duration 8m 45s      │
│                          │                          │                          │
│ ─── Components running ──│─── Components running ──│─── Components running ──│
│ 12 components            │ 14 components            │ 22 components            │
│ [View all →]             │ [View all →]             │ [View all →]             │
│                          │                          │                          │
│ ─── Settings ────────────│─── Settings ────────────│─── Settings ────────────│
│ Approval required: No    │ Approval required: No    │ Approval required: Yes  │
│ Freeze window: None      │ Freeze window: None      │ ⚠ Active: Marketing      │
│                          │                          │   campaign May 9-11      │
└──────────────────────────┴──────────────────────────┴──────────────────────────┘
```

Each section in card is collapsible. "Components running" can be expanded inline to show table:

```
COMPONENTS — STAGING

│ Component         │ Version  │ Deployed             │ CI                │
│ payment-api       │ 2.4.0    │ 7d ago (rolling out  │ CI-APP-PAY-001    │
│                   │          │  to 2.4.1 now)       │                   │
│ auth-service      │ 3.1.0    │ 8m ago               │ CI-APP-AUTH-001   │
│ order-api         │ 3.1.0    │ 47m ago              │ CI-APP-ORD-001    │
│ ...
```

For production card, the "Components running" section should highlight in red the components with downstream incident impact (link to dashboard).

### Recent deployments table (below env cards, full-width)

Cross-environment deployment history feed:

```
RECENT DEPLOYMENTS (LAST 7 DAYS)
[All envs ▾]   [All statuses ▾]                                           [View all →]

│ Env    │ Component       │ Version │ Status    │ Started        │ Duration  │
│ stg    │ payment-api     │ 2.4.1   │ ◉ running │ 7m ago         │ 7m 12s    │
│ dev    │ payment-api     │ 2.4.1   │ ✓ success │ 12m ago        │ 12m 0s    │
│ stg    │ auth-service    │ 3.1.0   │ ✓ success │ 8m ago         │ 4m 30s    │
│ stg    │ order-api       │ 3.1.0   │ ✓ success │ 47m ago        │ 5m 12s    │
│ prod   │ notification-gw │ 1.5.2   │ ✓ success │ 1d ago         │ 4m 45s    │
│ prod   │ search-service  │ 4.2.0   │ ↩ rolled  │ 5d ago         │ 3m → ↩    │
│ ...
```

Click row → deployment detail.

### Right rail (sticky, 280px)

```
┌─ DEPLOY HEALTH ───────────┐
│ Success rate (7d)  92%    │
│ Avg duration       6m 12s │
│ Active failures    0      │
│ Rollbacks (7d)     1      │
└────────────────────────────┘

┌─ FREEZE WINDOWS ──────────┐
│ ⚠ Production              │
│   May 9–11                 │
│   Marketing campaign       │
│   Only P1 changes allowed  │
└────────────────────────────┘

┌─ UPCOMING DEPLOYMENTS ────┐
│ Fri May 10 14:00 UTC       │
│ payment-api 2.4.1 → prod  │
│ via CHG-2026-00091         │
│ [View change →]            │
└────────────────────────────┘
```

---

## 📄 PAGE 4b.4 — Test Plans Library

**File:** `src/routes/testing/TestPlans.tsx`
**Route:** `/testing/plans`

### Page header

```
Test Plans
10 test plans · 6 active · Avg pass rate (30d): 94%
                                          [Cases →]   [Runs →]   [+ New plan]
```

### Filter bar

```
[🔍 Search...]  [Type ▾]  [Component ▾]  [Status ▾]  [Owner ▾]   [Reset]
```

### Stats strip

```
[All 10] [Regression 4] [Smoke 3] [Load 1] [Compliance 1] [Security 1]
[Pass rate ≥ 95%: 6] [Below 90%: 1] [Last run < 24h: 5]
```

### Plans table (DataTable)

Columns: `Public ID | Name | Type | Component | Cases | Last run | Pass rate (30d) | Owner | Actions`

- **Cases**: count badge, click to filter cases page by this plan
- **Last run**: relative time + status icon (passed/failed/running)
- **Pass rate**: % bar with color (green ≥95%, amber 80-95%, red <80%)
- **Actions**: `⋮` — Open, Run now, Edit cases, Archive, Duplicate

Default sort: by `lastRunAt` desc.

### Empty state

If no plans match: "No test plans match. [Reset]"

---

## 📄 PAGE 4b.5 — Test Cases Repository

**File:** `src/routes/testing/TestCases.tsx`
**Route:** `/testing/cases`

### Page header

```
Test Cases
30 cases · 23 automated · 7 manual · Avg flake rate: 4%
                                                            [+ New case]
```

### Filter bar

```
[🔍 Search title, ID, steps...]  [Type ▾]  [Priority ▾]  [Plan ▾]  [Automated ▾]  [Status ▾]   [Reset]
```

### Stats strip

```
[All 30] [P0 5] [P1 12] [P2 9] [P3 4]
[Functional 12] [Integration 8] [Smoke 5] [Performance 3] [Security 1] [Manual 1]
[Flaky (>10%) 2] [Never failed: 18]
```

### Cases table (DataTable)

Columns: `Public ID | Title | Type | Priority | Automated | Plan(s) | Last result | Flake rate | Actions`

- **Public ID**: mono
- **Title**: truncate with tooltip
- **Type/Priority**: pill chips
- **Automated**: ✓ icon with framework name (e.g. "Playwright"); — for manual
- **Plan(s)**: count badge with hover tooltip listing plans
- **Last result**: status icon + relative time
- **Flake rate**: % with color (green <5%, amber 5-15%, red >15%)
- **Actions**: `⋮` — Open, Edit steps, Run individually, Archive

Default sort: by priority asc, then title.

### Empty state

If no cases match: "No test cases match. [Reset]" or "No test cases yet. [+ Create]"

---

## 📄 PAGE 4b.6 — Test Runs (DOMINANT)

**File:** `src/routes/testing/TestRuns.tsx`
**Route:** `/testing/runs`

### Purpose
**Most prominent page in Validation cluster** (per Q4 decision). Live run feel, recent failures highlighted, animated pass/fail counters.

### Page header

```
Test Runs
1 currently running · 87% pass rate (30d) · 124 runs (last 30d)
                                                          [+ Trigger run]
```

### Active runs banner (when any running)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ◉ 1 RUN IN PROGRESS                                                      │
│                                                                            │
│ TST-RUN-2026-04812  payment-api pgbouncer regression suite                │
│ 16 of 24 cases · 8 pending · 0 failed                                     │
│ Started 8m ago · Triggered by DEP-2026-00342 (pre-deployment)             │
│                                                                            │
│ ████████████████████████████░░░░░░░░░░░░░░░ 67%                            │
│ Currently running: TST-CASE-2026-00465  Verify graceful shutdown          │
│                                                                            │
│                                                       [View live →]        │
└─────────────────────────────────────────────────────────────────────────────┘
```

Animated progress bar, live counters increment via setInterval (visual flair). Click "View live →" navigates to detail.

### Filter bar

```
[🔍 Search plan, run ID, environment...]  [Status ▾]  [Plan ▾]  [Environment ▾]  [Triggered by ▾]   [Reset]
```

### Stats strip

```
[All 10] [Running 1] [Passed 7] [Failed 1] [Partial 1]
[Pre-deployment runs: 4] [Scheduled: 3] [Manual: 3]
```

### Quick filter chips

```
[🔥 Failed last 24h (1)]  [⚠ Flaky tests detected (2)]  [📡 Live (1)]  [Production runs (3)]
```

### Test runs as detailed cards (vertical list)

Different from a dense table. Each run is a rich card:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ◉ RUNNING                                                  TST-RUN-2026-04812│
│                                                                            │
│ payment-api pgbouncer regression suite                                    │
│ TST-PLAN-2026-00012 · staging · pre_deployment                            │
│                                                                            │
│ Triggered by  DEP-2026-00342 (deployment) · 8m ago                       │
│                                                                            │
│ ████████████████████████░░░░░░░░░░░ 67%                                   │
│                                                                            │
│ ✓ 16 passed       0 failed       — 0 skipped       ⏱ 8 pending           │
│                                                                            │
│ Estimated remaining: ~8 minutes                                           │
│                                              [View live test run →]        │
└────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ ⚠ PARTIAL                                                  TST-RUN-2026-04811│
│                                                                            │
│ Payment Service load test (10x traffic)                                   │
│ TST-PLAN-2026-00009 · staging · scheduled                                 │
│                                                                            │
│ Completed 2h ago · Duration 43m                                           │
│                                                                            │
│ ████████████████████████████████████████ 100%                             │
│                                                                            │
│ ✓ 4 passed       ✗ 1 failed       — 0 skipped                            │
│                                                                            │
│ Top failure:                                                              │
│   TST-CASE-2026-00478 — Sustained 10x traffic for 30min                  │
│   ⚠ Marked as flaky · "p95 latency exceeded SLO at minute 22"            │
│                                                                            │
│                                              [View test run →]            │
└────────────────────────────────────────────────────────────────────────────┘

(more cards...)
```

For passed runs, simpler card with green border:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ✓ PASSED                                                   TST-RUN-2026-04810│
│ auth-service 3.x integration suite                                        │
│ TST-PLAN-2026-00008 · staging · pre_deployment · 32 of 32 ✓               │
│ Duration 24m · Completed 8m ago                                            │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Right rail (sticky, 280px)

```
┌─ TEST HEALTH ──────────────┐
│ Pass rate (30d)   87%      │
│ Pass rate (7d)    91%      │
│ Avg duration      14m      │
│ Total runs (30d)  124      │
└────────────────────────────┘

┌─ FLAKY TESTS ──────────────┐
│ 2 cases flagged as flaky:  │
│ TST-CASE-...478  18% flake │
│ TST-CASE-...451   5% flake │
│ [Review →]                  │
└────────────────────────────┘

┌─ FAILED CASES (LAST 7D) ───┐
│ TST-CASE-...410  search    │
│ TST-CASE-...478  load      │
│ [View all →]                │
└────────────────────────────┘
```

### Live test run detail (when clicking "View live →")

This is essentially **inline**: clicking expands the running card to show case-by-case results table inline. No separate route needed for MVP. The expanded view shows:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ TST-RUN-2026-04812 — payment-api pgbouncer regression suite              │
│                                                                            │
│ ████████████████████████░░░░░░░░░░░ 67%   8m elapsed   ETA ~8m           │
│                                                                            │
│ │ Status   │ Case ID            │ Title              │ Duration │ Action │
│ │ ✓ passed │ TST-CASE-2026-00450│ Verify checkout flow│   12.3s │   →   │
│ │ ✓ passed │ TST-CASE-2026-00451│ Verify pgbouncer    │   28.7s │   →   │
│ │ ✓ passed │ TST-CASE-2026-00452│ Graceful drain      │   18.2s │   →   │
│ │ ...                                                                      │
│ │ ✓ passed │ TST-CASE-2026-00464│ ...                 │    5.1s │   →   │
│ │ ◉ running│ TST-CASE-2026-00465│ Verify graceful sd  │  running│   →   │
│ │ ⏱ pending│ TST-CASE-2026-00466│ ...                 │       — │   —   │
│ │ ⏱ pending│ TST-CASE-2026-00467│ ...                 │       — │   —   │
│ │ ...                                                                      │
│                                                                            │
│ [Show all 24 cases ▾]                                                     │
└──────────────────────────────────────────────────────────────────────────────┘
```

Auto-refreshes every 5s while running (visual: just rotates pending → running → passed for next case in sequence to simulate progress).

### Failed run detail (clicking "View test run →" on TST-RUN-2026-04811)

Similar inline expansion but showing failure details prominently:

```
TOP FAILURES

┌─ TST-CASE-2026-00478 — Sustained 10x traffic for 30min ──────────────┐
│ Status: ✗ Failed                                                       │
│ Duration: 22m 15s (failed at minute 22 of 30)                          │
│ Flaky: ⚠ Yes (3rd flake in 30 days)                                   │
│                                                                          │
│ Failure message:                                                        │
│   p95 latency exceeded SLO at minute 22 (582ms vs 500ms target)        │
│                                                                          │
│ Stack trace:                                                            │
│   [collapsible code block]                                             │
│                                                                          │
│   [Re-run case]   [Mark as flaky / unflaky]   [Open case →]            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📄 PAGE 4b.7 — Sign-off Queue

**File:** `src/routes/testing/SignOffQueue.tsx`
**Route:** `/testing/sign-off`

### Page header

```
Sign-Off Queue
4 items · 3 pending · 1 due in <24h
                                                          [Filter ▾]
```

### Filter bar

```
[🔍 Search...]  [Type ▾]  [Status ▾]  [Approver ▾]  [SLA ▾]   [Reset]
```

### Quick filter chips

```
[🔥 My pending (1)]  [⚠ SLA at risk (1)]  [📋 Release validations (2)]
```

### Sign-offs as cards (vertical list)

Each sign-off as a detailed card:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ⏱ PENDING                                                  SGN-2026-00041 │
│                                                                            │
│ Release validation: order-api 3.1.0 production                           │
│ REL-2026-00018 · order-api 3.1.0                                          │
│                                                                            │
│ Test runs:    1 of 1 passed (TST-RUN-2026-04809)                          │
│ Tests:        18 cases · all passed · Duration 12m                        │
│                                                                            │
│ Approver:    Helena Vasquez (Release Manager)                            │
│ Requested:   45m ago by automated pipeline                                │
│ Due:         May 9, 18:00 UTC (in 33h)                                    │
│                                                                            │
│ Evidence:                                                                  │
│ ✓ Pre-deployment smoke tests passed                                       │
│ ✓ Staging deployment healthy 45m                                         │
│ ✓ All test cases in TST-PLAN-2026-00007 passed                           │
│                                                                            │
│ ── Helena's pending action: Approve this sign-off ──                     │
│                                            [✗ Reject] [✓ Approve]         │
└──────────────────────────────────────────────────────────────────────────┘
```

For sign-offs not for current user, show simpler card with status info but no actions.

For approved/rejected, show outcome:
```
┌──────────────────────────────────────────────────────────────────────────┐
│ ✓ APPROVED                                                  SGN-2026-00038 │
│ Q2 PCI-DSS compliance attestation                                          │
│ ...                                                                          │
│ Approved by Sarah Chen · May 1, 15:00 UTC                                 │
│ "Q2 compliance review complete. All controls verified."                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Approval modal

`[✓ Approve]` opens modal:

```
Approve sign-off SGN-2026-00041                                       [×]

Release validation: order-api 3.1.0 production

  Decision note (optional)
  [                                                                    ]

  [✓] I confirm that I have reviewed all test evidence
  [ ] Schedule a follow-up health check for 24h post-deployment
                                                  [Cancel] [Approve]
```

`[✗ Reject]` opens modal requiring decision note (required, min 30 chars).

### Empty state

If no sign-offs: icon ClipboardCheck, "All sign-offs current. Nothing pending."

---

## 🎨 SHARED COMPONENTS

### `src/components/deployments/`

```
components/deployments/
├── DeploymentRow.tsx                # DataTable row
├── DeploymentStatusPill.tsx
├── EnvironmentChip.tsx              # dev/staging/prod with env color
├── DeploymentStrategyChip.tsx
├── DeploymentTriggerChip.tsx
├── ActiveDeploymentBanner.tsx       # Top banner for queue page
├── DeploymentDetail/
│   ├── DeploymentHero.tsx           # Big header with status-specific styling
│   ├── DeploymentStages.tsx         # Vertical pipeline of stage cards
│   ├── DeploymentStageCard.tsx
│   ├── LogPanel.tsx                 # Datadog-style log viewer
│   ├── LogEntry.tsx
│   ├── LogFilters.tsx
│   ├── LogStreamControls.tsx        # Pause/play/export
│   └── RollbackModal.tsx
├── EnvironmentCard.tsx              # Big card for environments page
├── EnvironmentComponentTable.tsx
└── RecentDeploymentsTable.tsx
```

### `src/components/testing/`

```
components/testing/
├── TestPlanRow.tsx
├── TestCaseRow.tsx
├── TestRunCard.tsx                  # Detailed run card for runs page
├── TestRunStatusBadge.tsx
├── TestStepResultBadge.tsx
├── TestPassRateBar.tsx
├── ActiveTestRunBanner.tsx
├── LiveTestRunDetail.tsx            # Inline expansion of running card
├── TestCaseResultsTable.tsx
├── FailureDetailCard.tsx
├── FlakyTestBadge.tsx
├── SignOffCard.tsx
├── SignOffApproveModal.tsx
├── SignOffRejectModal.tsx
└── EvidenceList.tsx                 # Test evidence display in sign-off
```

### Constants in `src/lib/constants.ts`

```typescript
export const deploymentStatusMeta: Record<DeploymentStatus, { label: string; color: string; bg: string; dot: string; animated: boolean }> = {
  pending:       { label: 'Pending',       color: '#475467', bg: '#F1F3F7', dot: '#98A2B3', animated: false },
  running:       { label: 'Running',       color: '#0BA5EC', bg: '#F0F9FF', dot: '#0BA5EC', animated: true },
  success:       { label: 'Success',       color: '#067647', bg: '#ECFDF3', dot: '#12B76A', animated: false },
  failed:        { label: 'Failed',        color: '#B42318', bg: '#FEF3F2', dot: '#F04438', animated: false },
  rolled_back:   { label: 'Rolled Back',   color: '#DC6803', bg: '#FFFAEB', dot: '#F79009', animated: false },
  cancelled:     { label: 'Cancelled',     color: '#475467', bg: '#F1F3F7', dot: '#98A2B3', animated: false },
  rolling_back:  { label: 'Rolling Back',  color: '#DC6803', bg: '#FFFAEB', dot: '#F79009', animated: true },
};

export const environmentMeta: Record<Environment, { label: string; color: string; bg: string; shortLabel: string }> = {
  development: { label: 'Development', color: '#475467', bg: '#F1F3F7', shortLabel: 'dev'  },
  staging:     { label: 'Staging',     color: '#0BA5EC', bg: '#F0F9FF', shortLabel: 'stg'  },
  production:  { label: 'Production',  color: '#B42318', bg: '#FEF3F2', shortLabel: 'prod' },
};

export const deploymentStrategyMeta: Record<DeploymentStrategy, { label: string; description: string; icon: string }> = {
  rolling:    { label: 'Rolling',    description: 'Gradual replacement', icon: 'RefreshCw' },
  blue_green: { label: 'Blue-Green', description: 'Switch at the end',   icon: 'GitBranch' },
  canary:     { label: 'Canary',     description: 'Small % first',       icon: 'Bird' },
  big_bang:   { label: 'Big Bang',   description: 'All at once',         icon: 'Zap' },
  phased:     { label: 'Phased',     description: 'Manual gates',        icon: 'Layers' },
};

export const deploymentTriggerMeta: Record<DeploymentTrigger, { label: string; icon: string; color: string }> = {
  manual:         { label: 'Manual',         icon: 'User',         color: '#475467' },
  cicd_pipeline:  { label: 'CI/CD',          icon: 'GitBranch',    color: '#0BA5EC' },
  scheduled:      { label: 'Scheduled',      icon: 'Clock',        color: '#6941C6' },
  auto_promotion: { label: 'Auto-Promotion', icon: 'TrendingUp',   color: '#067647' },
};

export const stageStatusMeta_dep: Record<DeploymentStageStatus, { color: string; icon: string; nodeStyle: string }> = {
  pending: { color: '#98A2B3', icon: 'Circle',       nodeStyle: 'pending' },
  running: { color: '#0BA5EC', icon: 'Loader2',      nodeStyle: 'active' },
  success: { color: '#12B76A', icon: 'CheckCircle2', nodeStyle: 'completed' },
  failed:  { color: '#F04438', icon: 'XCircle',      nodeStyle: 'failed' },
  skipped: { color: '#98A2B3', icon: 'MinusCircle',  nodeStyle: 'skipped' },
};

export const logLevelMeta: Record<LogLevel, { label: string; color: string; bg: string }> = {
  debug: { label: 'DEBUG', color: '#475467', bg: '#F1F3F7' },
  info:  { label: 'INFO',  color: '#0BA5EC', bg: '#F0F9FF' },
  warn:  { label: 'WARN',  color: '#DC6803', bg: '#FFFAEB' },
  error: { label: 'ERROR', color: '#B42318', bg: '#FEF3F2' },
  fatal: { label: 'FATAL', color: '#FFFFFF', bg: '#B42318' },
};

export const testRunStatusMeta: Record<TestRunStatus, { label: string; color: string; bg: string; dot: string }> = {
  pending:    { label: 'Pending',    color: '#475467', bg: '#F1F3F7', dot: '#98A2B3' },
  running:    { label: 'Running',    color: '#0BA5EC', bg: '#F0F9FF', dot: '#0BA5EC' },
  passed:     { label: 'Passed',     color: '#067647', bg: '#ECFDF3', dot: '#12B76A' },
  failed:     { label: 'Failed',     color: '#B42318', bg: '#FEF3F2', dot: '#F04438' },
  partial:    { label: 'Partial',    color: '#DC6803', bg: '#FFFAEB', dot: '#F79009' },
  cancelled:  { label: 'Cancelled',  color: '#475467', bg: '#F1F3F7', dot: '#98A2B3' },
  timed_out:  { label: 'Timed Out',  color: '#B42318', bg: '#FEF3F2', dot: '#F04438' },
};

export const testStepResultMeta: Record<TestStepResultStatus, { label: string; color: string; icon: string }> = {
  pending: { label: 'Pending', color: '#98A2B3', icon: 'Circle' },
  running: { label: 'Running', color: '#0BA5EC', icon: 'Loader2' },
  passed:  { label: 'Passed',  color: '#12B76A', icon: 'CheckCircle2' },
  failed:  { label: 'Failed',  color: '#F04438', icon: 'XCircle' },
  skipped: { label: 'Skipped', color: '#98A2B3', icon: 'MinusCircle' },
};

export const testCasePriorityMeta: Record<TestCasePriority, { label: string; color: string; bg: string }> = {
  p0: { label: 'P0',  color: '#B42318', bg: '#FEF3F2' },
  p1: { label: 'P1',  color: '#DC6803', bg: '#FFFAEB' },
  p2: { label: 'P2',  color: '#0BA5EC', bg: '#F0F9FF' },
  p3: { label: 'P3',  color: '#475467', bg: '#F1F3F7' },
};

export const signOffStatusMeta: Record<SignOffStatus, { label: string; color: string; bg: string }> = {
  pending:  { label: 'Pending',  color: '#DC6803', bg: '#FFFAEB' },
  approved: { label: 'Approved', color: '#067647', bg: '#ECFDF3' },
  rejected: { label: 'Rejected', color: '#B42318', bg: '#FEF3F2' },
  expired:  { label: 'Expired',  color: '#475467', bg: '#F1F3F7' },
};

export const signOffTypeMeta: Record<SignOffType, { label: string; icon: string }> = {
  release_validation:  { label: 'Release validation',  icon: 'Package' },
  change_validation:   { label: 'Change validation',   icon: 'Wrench' },
  security_scan:       { label: 'Security scan',       icon: 'Shield' },
  compliance_check:    { label: 'Compliance check',    icon: 'ShieldCheck' },
};
```

---

## 🔀 ROUTING UPDATE

In `src/routes/index.tsx`, replace placeholders:

```tsx
// Replace
{ path: 'deployments',                element: <Placeholder ... /> },
{ path: 'deployments/:id',            element: <Placeholder ... /> },
{ path: 'environments',               element: <Placeholder ... /> },
{ path: 'testing/plans',              element: <Placeholder ... /> },
{ path: 'testing/cases',              element: <Placeholder ... /> },
{ path: 'testing/runs',               element: <Placeholder ... /> },
{ path: 'testing/sign-off',           element: <Placeholder ... /> },

// With
{ path: 'deployments',                element: <DeploymentsQueue /> },
{ path: 'deployments/:deploymentId',  element: <DeploymentDetail /> },
{ path: 'environments',               element: <Environments /> },
{ path: 'testing/plans',              element: <TestPlans /> },
{ path: 'testing/cases',              element: <TestCases /> },
{ path: 'testing/runs',               element: <TestRuns /> },
{ path: 'testing/sign-off',           element: <SignOffQueue /> },
```

---

## 🔗 CROSS-LINKING

Real links activated by Doc 4b:
- Deployment → linked release → `/releases/{id}` (Doc 4a real)
- Deployment → linked change → `/changes/{id}` (Doc 4a real)
- Deployment → target CIs → `/cmdb/{ciId}` (Doc 1 real)
- Deployment → triggered incidents → `/incidents/{id}` (Doc 3a real)
- Deployment → linked test run → `/testing/runs?focus={runId}` (Doc 4b real, scrolls + expands)
- Environment card → linked CI → `/cmdb/{ciId}` real
- Environment card → upcoming change → `/changes/{id}` real
- Environment card → freeze window detail → could link to Change settings (placeholder)
- Test plan → linked release → `/releases/{id}` real
- Test plan → cases → `/testing/cases?plan={planId}` real
- Test case → containing plans → `/testing/plans?case={caseId}` real
- Test case → automation source → external GitHub link (visual)
- Test run → linked deployment → `/deployments/{id}` real
- Test run → linked release → `/releases/{id}` real
- Test run case results → `/testing/cases/{caseId}` (placeholder for case detail; or keep as inline)
- Sign-off → subject (release/change/incident PIR) → real link
- Sign-off → test runs → real link

**Update existing modules:**

1. **Doc 0 dashboard:**
   - Add "Active Deployments" widget showing running deployments (1 currently)
   - Notification `ntf-009` (Deploy completed: REL-2026-00016) → real link to DEP-2026-00335
   - Add "Active Test Runs" sub-section in service health area

2. **Doc 4a release detail:**
   - Pipeline tab: stages now reference real deployments via `linkedDeploymentIds`. Each stage card links to deployment detail.
   - Composition tab: linked test plans via `linkedTestRunIds`

3. **Doc 4a change detail:**
   - "Linked items" tab: test plan section now uses real test plans
   - "Implementation" status: when change moves to "implementing", a deployment is created. Show status badge of linked deployment in change overview.

4. **Doc 3a incident detail:**
   - Incidents triggered by deployments (e.g. INC-2026-00148 from DEP-2026-00328 rollback) — back-link to deployment in linked items tab.

5. **Doc 1 CMDB detail:**
   - "Linked items" tab — add "Recent Deployments" section using `getDeploymentsByCI(ciId)` real data.

6. **Doc 0 dashboard:** "Recent Changes & Releases" section can include deployment status indicators (e.g., next to CHG-091 show "Deploy planned May 10 14:00 UTC").

---

## ✅ QUALITY CHECKLIST

- [ ] All 7 routes work without 404
- [ ] `/deployments` shows active banner for DEP-2026-00342 with progress
- [ ] Queue table has env color chips, status pills with animated dot for running
- [ ] Filter and quick filter chips work
- [ ] Bulk actions work
- [ ] `/deployments/DEP-2026-00342` shows dramatic hero with live progress
- [ ] Hero has color-changing background based on status
- [ ] [Rollback] button is prominent and red, opens modal with reason field
- [ ] Stages visualization shows vertical pipeline with all 7 stages (k8s-style)
- [ ] Active stage has pulsing border and progress bar
- [ ] Live logs panel shows scrollable entries with level colors
- [ ] Log search filters entries real-time
- [ ] Log level checkboxes filter visible entries
- [ ] Stream toggle pauses/resumes auto-scroll (visual)
- [ ] Tabs (Overview, Manifest, Linked Items, Triggered Incidents, History) all work
- [ ] Linked Items tab shows real cross-links to release, change, problem, incidents
- [ ] `/environments` shows 3 tall cards (dev/staging/prod) side by side
- [ ] Each env card shows health, active deployments inline, recent stats, components, settings
- [ ] Production card highlights freeze window in amber
- [ ] Components running section expandable showing version table
- [ ] Recent deployments cross-env table at bottom of page
- [ ] `/testing/plans` shows DataTable with 10 plans
- [ ] Pass rate column color-coded
- [ ] Run now action available
- [ ] `/testing/cases` shows DataTable with 30 cases
- [ ] Filters by type, priority, automated, plan, status work
- [ ] Flake rate column color-coded
- [ ] `/testing/runs` shows active banner for live run with animated counters
- [ ] Test run cards show pass/fail/skipped counters prominently
- [ ] Failed run highlights top failures with error messages
- [ ] Click "View live →" expands inline showing case-by-case results table
- [ ] Live expansion auto-refreshes every 5s simulating progress
- [ ] Right rail shows test health stats + flaky tests + recent failures
- [ ] `/testing/sign-off` shows 4 sign-off cards
- [ ] Pending sign-off (SGN-041) shows test evidence section
- [ ] Approve modal works with optional decision note
- [ ] Reject modal requires note (min 30 chars)
- [ ] Approved sign-offs show outcome with rationale
- [ ] All public IDs use mono font
- [ ] Cross-links to releases/changes/CIs/incidents/problems all work (real)
- [ ] Doc 0 dashboard updated with active deployments widget
- [ ] Doc 0 notification ntf-009 links to real deployment
- [ ] Doc 4a release pipeline tab references real deployments
- [ ] Doc 1 CMDB detail Linked Items has "Recent Deployments" section
- [ ] Sidebar nav highlights "Deployments", "Validation & Testing" parent on routes
- [ ] No console / TypeScript errors

---

## 🚀 DELIVERABLE

Extend the existing project. Confirm:

1. New types in `src/types/deployment.ts` and `src/types/testing.ts`, re-exported
2. Mock data: `deployments.ts`, `deploymentLogs.ts`, `environments.ts`, `testPlans.ts`, `testCases.ts`, `testRuns.ts`, `signOffs.ts`
3. Module components in `src/components/deployments/` and `src/components/testing/`
4. 7 route files in `src/routes/deployments/` and `src/routes/testing/`
5. Routing config updated
6. Sidebar items "Deployments", "Environments", "Validation & Testing" highlight correctly
7. Doc 0 dashboard / Doc 4a release & change detail / Doc 1 CMDB / Doc 3a incident detail updated with real Doc 4b data

After generation, do not start Doc 5. Wait for the next prompt.

---

*End of Doc 4b. Change & Delivery cluster complete.*
