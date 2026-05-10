import { ServiceTier } from './availability';

export type RTOClass =
  | 'immediate'
  | 'short'
  | 'medium'
  | 'long'
  | 'extended';

export type BIAImpactLevel = 'catastrophic' | 'critical' | 'major' | 'moderate' | 'minor';

export type DRTestType =
  | 'tabletop'
  | 'functional'
  | 'full_failover'
  | 'chaos';

export type DRTestStatus =
  | 'planned'
  | 'in_progress'
  | 'passed'
  | 'passed_with_issues'
  | 'failed'
  | 'cancelled';

export type DRPlanStatus = 'draft' | 'approved' | 'active' | 'under_review' | 'retired';

export interface BIAEntry {
  id: string;
  publicId: string;
  serviceId: string;
  serviceName: string;
  serviceTier: ServiceTier;
  description: string;
  impactLevel: BIAImpactLevel;
  impactScore: number;
  rto: number;
  rpoMinutes: number;
  rtoClass: RTOClass;
  estimatedHourlyCostUSD: number;
  estimatedDailyCostUSD: number;
  affectedUserSegments: string[];
  peakTrafficTimes: string;
  customerFacing: boolean;
  regulatoryCompliance: string[];
  criticalDependencies: Array<{
    type: 'service' | 'ci' | 'external';
    referenceId: string;
    referenceName: string;
    dependencyType: 'hard' | 'soft';
    failoverAvailable: boolean;
  }>;
  linkedDRPlanIds: string[];
  linkedDRPlanPublicIds: string[];
  lastReviewedAt: string;
  reviewedById: string;
  reviewedByName: string;
  nextReviewAt: string;
  approvedById?: string;
  approvedByName?: string;
  notes?: string;
  continuityRisks: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DRPlan {
  id: string;
  publicId: string;
  name: string;
  description: string;
  serviceIds: string[];
  serviceNames: string[];
  affectedCIIds: string[];
  biaEntryIds: string[];
  status: DRPlanStatus;
  version: string;
  objectives: string;
  triggerConditions: string[];
  activationProcedure: string;
  communicationPlan: string;
  recoverySteps: DRPlanStep[];
  rollbackProcedure: string;
  testingSchedule: string;
  incidentCommanderId?: string;
  communicationsLeadId?: string;
  technicalLeadId?: string;
  stakeholders: Array<{
    userId: string;
    userName: string;
    role: string;
  }>;
  lastTestedAt?: string;
  lastTestStatus?: DRTestStatus;
  testRunCount: number;
  approvedById?: string;
  approvedByName?: string;
  approvedAt?: string;
  reviewDueAt: string;
  linkedChangeIds: string[];
  linkedKBSlugs: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DRPlanStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  estimatedMinutes: number;
  owner: string;
  critical: boolean;
  verificationCriteria: string;
}

export interface DRTestRun {
  id: string;
  publicId: string;
  planId: string;
  planPublicId: string;
  planName: string;
  type: DRTestType;
  status: DRTestStatus;
  triggeredById: string;
  triggeredByName: string;
  environment: string;
  isLive: boolean;
  objectives: string[];
  scope: string;
  plannedDate: string;
  startedAt?: string;
  completedAt?: string;
  durationMinutes?: number;
  stepResults: DRTestStepResult[];
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  rtoAchievedMinutes?: number;
  rtoTargetMinutes?: number;
  rpoAchievedMinutes?: number;
  rpoTargetMinutes?: number;
  issues: DRTestIssue[];
  lessonsLearned?: string;
  recommendations?: string;
  participants: Array<{ userId: string; userName: string; role: string }>;
  triggeredIncidentIds: string[];
  linkedChangeIds: string[];
  reviewedById?: string;
  reviewedByName?: string;
  signedOffAt?: string;
  createdAt: string;
}

export interface DRTestStepResult {
  id: string;
  stepId: string;
  stepNumber: number;
  stepTitle: string;
  status: 'pending' | 'in_progress' | 'passed' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  durationMinutes?: number;
  notes?: string;
  issues?: string[];
  executorId?: string;
  executorName?: string;
}

export interface DRTestIssue {
  id: string;
  severity: 'critical' | 'major' | 'minor' | 'observation';
  title: string;
  description: string;
  stepId?: string;
  resolution?: string;
  linkedChangePublicId?: string;
  status: 'open' | 'in_progress' | 'resolved';
}
