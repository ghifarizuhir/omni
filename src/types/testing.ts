import { Environment } from './ci';

export type TestPlanType =
  | 'release'
  | 'regression'
  | 'smoke'
  | 'load'
  | 'security'
  | 'compliance';

export type TestPlanStatus = 'draft' | 'active' | 'archived';

export type TestCaseType =
  | 'functional'
  | 'integration'
  | 'smoke'
  | 'performance'
  | 'security'
  | 'manual';

export type TestCasePriority = 'p0' | 'p1' | 'p2' | 'p3';
export type TestCaseStatus = 'active' | 'archived' | 'flaky';

export type TestRunStatus =
  | 'pending'
  | 'running'
  | 'passed'
  | 'failed'
  | 'partial'
  | 'cancelled'
  | 'timed_out';

export type TestStepResultStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

export type SignOffStatus = 'pending' | 'approved' | 'rejected' | 'expired';
export type SignOffType = 'release_validation' | 'change_validation' | 'security_scan' | 'compliance_check';

export interface TestPlan {
  id: string;
  publicId: string;
  name: string;
  description?: string;
  type: TestPlanType;
  status: TestPlanStatus;

  componentName?: string;
  affectedCIIds: string[];
  linkedReleaseIds: string[];
  linkedChangeIds: string[];

  testCaseIds: string[];
  caseCount: number;

  estimatedDurationMin: number;
  requiredEnvironment: Environment[];
  prerequisites: string[];

  lastRunAt?: string;
  lastRunStatus?: TestRunStatus;
  totalRuns: number;
  passRate30d: number;

  ownerId: string;
  ownerName: string;
  ownerTeamId: string;

  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TestCase {
  id: string;
  publicId: string;
  title: string;
  description: string;
  type: TestCaseType;
  priority: TestCasePriority;
  status: TestCaseStatus;

  preconditions: string;
  steps: Array<{
    stepNumber: number;
    action: string;
    expectedResult: string;
  }>;
  postconditions?: string;

  isAutomated: boolean;
  automationFramework?: string;
  automationRef?: string;

  affectedCIIds: string[];
  linkedRequirementIds: string[];
  containedInPlans: string[];

  executionCount: number;
  failureCount: number;
  flakeRate?: number;
  lastExecutedAt?: string;
  lastResult?: TestStepResultStatus;
  averageDurationSec?: number;

  ownerId: string;
  ownerName: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TestRun {
  id: string;
  publicId: string;
  testPlanId: string;
  testPlanPublicId: string;
  testPlanName: string;

  status: TestRunStatus;

  triggeredById: string;
  triggeredByName: string;
  triggeredBy: 'manual' | 'cicd' | 'scheduled' | 'pre_deployment' | 'post_deployment';
  environment: Environment;

  linkedDeploymentId?: string;
  linkedDeploymentPublicId?: string;
  linkedReleasePublicId?: string;

  startedAt?: string;
  completedAt?: string;
  durationSec?: number;
  estimatedDurationMin: number;

  totalCases: number;
  passedCount: number;
  failedCount: number;
  skippedCount: number;
  pendingCount: number;
  passRate: number;

  caseResults: TestRunCaseResult[];

  topFailures?: Array<{
    casePublicId: string;
    title: string;
    failureMessage: string;
    isFlaky: boolean;
  }>;

  pipelineRunId?: string;
  pipelineUrl?: string;
  artifactRef?: string;

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
  message?: string;
  errorTrace?: string;
  isFlaky?: boolean;
  retryCount: number;
}

export interface SignOff {
  id: string;
  publicId: string;
  type: SignOffType;
  status: SignOffStatus;
  title: string;

  subjectType: 'release' | 'change' | 'incident_pir';
  subjectId: string;
  subjectPublicId: string;
  subjectTitle: string;

  testRunIds: string[];
  testRunSummary: {
    totalRuns: number;
    passedRuns: number;
    failedRuns: number;
  };

  requestedById: string;
  requestedByName: string;
  requestedAt: string;
  approverId: string;
  approverName: string;
  approverRole: string;
  decidedAt?: string;
  decision?: 'approved' | 'rejected';
  decisionNote?: string;

  dueAt: string;
  slaBreached: boolean;

  createdAt: string;
  updatedAt: string;
}
