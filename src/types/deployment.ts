import { Environment } from './ci';

export type DeploymentStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'rolled_back'
  | 'cancelled'
  | 'rolling_back';

export type DeploymentStrategy =
  | 'rolling'
  | 'blue_green'
  | 'canary'
  | 'big_bang'
  | 'phased';

export type DeploymentTrigger =
  | 'manual'
  | 'cicd_pipeline'
  | 'scheduled'
  | 'auto_promotion';

export type DeploymentStageStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'skipped';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface Deployment {
  id: string;
  publicId: string;

  componentName: string;
  componentCIPublicId?: string;
  artifactRef: string;
  commitSha: string;
  commitMessage?: string;
  branch: string;

  environment: Environment;
  targetCIIds: string[];

  status: DeploymentStatus;
  strategy: DeploymentStrategy;
  trigger: DeploymentTrigger;
  triggeredById: string;
  triggeredByName: string;

  linkedReleaseId?: string;
  linkedReleasePublicId?: string;
  linkedChangeId?: string;
  linkedChangePublicId?: string;

  stages: DeploymentStage[];
  currentStageIndex: number;

  scheduledFor?: string;
  startedAt?: string;
  completedAt?: string;
  durationSec?: number;

  postDeployHealth: 'pending' | 'healthy' | 'degraded' | 'failed';
  healthCheckedAt?: string;

  rollback?: {
    initiatedAt: string;
    initiatedBy: string;
    reason: string;
    rolledBackToDeploymentId?: string;
    completedAt?: string;
  };

  triggeredIncidentIds: string[];

  pipelineRunId?: string;
  pipelineUrl?: string;
  configHash?: string;
  manifestRef?: string;
  manifestYaml?: string;

  tags: string[];

  createdAt: string;
  updatedAt: string;
}

export interface DeploymentStage {
  id: string;
  name: string;
  type: 'preparation' | 'apply' | 'verification' | 'finalization';
  status: DeploymentStageStatus;
  startedAt?: string;
  completedAt?: string;
  durationSec?: number;
  progressPercent?: number;
  progressLabel?: string;
  exitCode?: number;
  errorMessage?: string;
  warningCount?: number;
}

export interface DeploymentLogEntry {
  id: string;
  deploymentId: string;
  stageId?: string;
  timestamp: string;
  level: LogLevel;
  source: string;
  message: string;
  fields?: Record<string, string | number | boolean>;
  stackTrace?: string;
}

export interface EnvironmentInfo {
  id: string;
  name: Environment;
  displayName: string;
  description?: string;
  health: 'healthy' | 'degraded' | 'down';
  uptime30d: number;
  activeDeploymentIds: string[];
  recentDeploymentCount24h: number;
  recentDeploymentCount7d: number;
  failureRate7d: number;
  runningComponents: Array<{
    componentName: string;
    componentCIPublicId?: string;
    currentVersion: string;
    deployedAt: string;
    lastDeploymentId: string;
  }>;
  ciCount: number;
  freezeWindowActive: boolean;
  freezeWindowReason?: string;
  approvalRequired: boolean;
}
