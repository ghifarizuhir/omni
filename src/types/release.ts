import { ChangeType, RiskLevel } from './change';
import { Environment } from './ci';

export type ReleaseType =
  | 'major'
  | 'minor'
  | 'patch'
  | 'hotfix';

export type ReleaseStatus =
  | 'planning'
  | 'locked'
  | 'in_validation'
  | 'ready'
  | 'deploying'
  | 'released'
  | 'partially_released'
  | 'rolled_back'
  | 'cancelled';

export interface Release {
  id: string;
  publicId: string;
  version: string;
  name: string;
  description: string;

  type: ReleaseType;
  status: ReleaseStatus;

  componentName: string;
  componentRepoUrl?: string;
  componentCIPublicId?: string;

  composition: ReleaseComposition;

  plannedReleaseDate: string;
  actualReleaseDate?: string;

  stages: ReleaseStage[];
  currentStageIndex: number;

  releaseManagerId: string;
  releaseManagerName: string;
  ownerTeamId: string;

  releaseNotes: string;
  internalNotes?: string;

  linkedDeploymentIds: string[];
  linkedTestRunIds: string[];
  linkedKBSlugs: string[];

  featureFlags: Array<{
    key: string;
    description: string;
    enabledByDefault: boolean;
    targeting?: string;
  }>;

  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ReleaseComposition {
  changes: Array<{
    publicId: string;
    title: string;
    type: ChangeType;
    risk: RiskLevel;
  }>;
  problemsFixed: Array<{
    publicId: string;
    title: string;
  }>;
  incidentsResolved: Array<{
    publicId: string;
    title: string;
  }>;
  prerequisites: Array<{
    type: 'release' | 'change' | 'manual_step';
    reference: string;
    status: 'met' | 'pending' | 'blocked';
  }>;
}

export interface ReleaseStage {
  id: string;
  environment: Environment;
  status: 'pending' | 'in_progress' | 'success' | 'failed' | 'rolled_back' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  deploymentPublicId?: string;
  testsPassed?: number;
  testsTotal?: number;
  postDeployHealthCheck: 'pending' | 'healthy' | 'degraded' | 'failed';
  approvalRequired: boolean;
  approverId?: string;
  approvedAt?: string;
}
