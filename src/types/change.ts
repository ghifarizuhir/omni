import { Severity } from './common';

export type ChangeType =
  | 'standard'
  | 'normal'
  | 'emergency';

export type ChangeStatus =
  | 'draft'
  | 'submitted'
  | 'in_review'
  | 'approved'
  | 'scheduled'
  | 'implementing'
  | 'implemented'
  | 'closed_successful'
  | 'closed_failed'
  | 'rejected'
  | 'cancelled';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type ImpactLevel = 'minimal' | 'minor' | 'moderate' | 'major' | 'extensive';

export type CABVote = 'approve' | 'approve_with_conditions' | 'reject' | 'abstain';

export interface Change {
  id: string;
  publicId: string;

  title: string;
  description: string;
  justification: string;
  type: ChangeType;
  status: ChangeStatus;

  risk: RiskLevel;
  impact: ImpactLevel;
  riskScore: number;
  riskFactors: string[];

  plannedStart: string;
  plannedEnd: string;
  actualStart?: string;
  actualEnd?: string;
  implementationWindow: string;
  freezeWindow?: boolean;

  requesterId: string;
  requesterName: string;
  ownerId: string;
  ownerName: string;
  ownerTeamId: string;

  affectedCIIds: string[];
  affectedCIPublicIds: string[];
  affectedServiceIds: string[];

  implementationPlan: string;
  rollbackPlan: string;
  testPlan: string;

  linkedProblemIds: string[];
  linkedIncidentIds: string[];
  linkedReleaseId?: string;
  linkedReleasePublicId?: string;
  linkedKBSlugs: string[];

  technicalAssessment?: TechnicalAssessment;

  approvals: ChangeApproval[];
  cabReviewedAt?: string;
  cabSessionId?: string;

  conflicts: ChangeConflict[];

  pir?: PIR;

  commsRequired: boolean;
  commsChannels: string[];

  tags: string[];
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
}

export type TechAssessmentStatus =
  | 'not_started'
  | 'in_progress'
  | 'submitted'
  | 'approved'
  | 'rework_required';

export type TechRiskLikelihood = 'rare' | 'unlikely' | 'possible' | 'likely' | 'almost_certain';
export type TechRiskImpact = 'negligible' | 'minor' | 'moderate' | 'major' | 'severe';

export interface TechnicalRisk {
  id: string;
  description: string;
  likelihood: TechRiskLikelihood;
  impact: TechRiskImpact;
  mitigation: string;
  owner?: string;
}

export interface TechnicalAssessment {
  status: TechAssessmentStatus;
  objective: string;
  technicalScope: string;
  prerequisites: string[];
  dependencies: string[];
  performanceImpact?: string;
  securityConsiderations?: string;
  observabilityNotes?: string;
  risks: TechnicalRisk[];
  reviewerId?: string;
  reviewerName?: string;
  reviewerRole?: string;
  reviewedAt?: string;
  signOffNote?: string;
  submittedAt?: string;
  submittedBy?: string;
}

export interface ChangeApproval {
  id: string;
  changeId: string;
  approverId: string;
  approverName: string;
  approverRole: string;
  decision: CABVote | 'pending';
  conditions?: string;
  rationale?: string;
  decidedAt?: string;
  weight: number;
}

export interface ChangeConflict {
  id: string;
  type: 'time_overlap' | 'ci_overlap' | 'service_overlap' | 'freeze_window' | 'dependency';
  severity: 'warning' | 'blocking';
  description: string;
  conflictsWith: string[];
  detectedAt: string;
  resolvedAt?: string;
  resolutionNote?: string;
}

export interface PIR {
  id: string;
  changeId: string;
  outcome: 'success' | 'partial_success' | 'failed' | 'rolled_back';
  plannedDurationMin: number;
  actualDurationMin: number;
  unplannedDowntimeMin: number;
  customerImpact?: string;
  whatWentWell: string;
  whatWentWrong?: string;
  lessonsLearned: string;
  triggeredIncidentIds: string[];
  followUpActions: Array<{
    description: string;
    type: 'preventive' | 'corrective';
    owner: string;
    targetDate: string;
    status: 'open' | 'in_progress' | 'done';
    linkedImprovementId?: string;
  }>;
  reviewedAt: string;
  reviewedBy: string;
  signedOffAt?: string;
  signedOffBy?: string;
}
