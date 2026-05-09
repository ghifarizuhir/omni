import { Severity } from './common';

export type ProblemStatus =
  | 'identified'
  | 'investigating'
  | 'known_error'
  | 'fix_in_progress'
  | 'closed';

export type ProblemSource =
  | 'incident_pattern'
  | 'major_incident'
  | 'proactive'
  | 'audit'
  | 'user_reported';

export type RCATechnique = 'five_whys' | 'fishbone' | 'fault_tree' | 'timeline' | 'narrative';

export interface RCAAnalysis {
  id: string;
  problemId: string;
  technique: RCATechnique;
  summary: string;

  fiveWhys?: Array<{
    level: number;
    question: string;
    answer: string;
  }>;

  fishbone?: {
    problem: string;
    categories: Array<{
      name: string;
      causes: string[];
    }>;
  };

  timelineEntries?: Array<{
    timestamp: string;
    event: string;
    isContributing: boolean;
  }>;

  rootCauses: string[];
  contributingFactors: string[];
  recommendedActions: Array<{
    description: string;
    type: 'preventive' | 'detective' | 'corrective';
    owner?: string;
    targetDate?: string;
    status: 'open' | 'in_progress' | 'done';
    linkedChangeId?: string;
    linkedImprovementId?: string;
  }>;

  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface Problem {
  id: string;
  publicId: string;

  title: string;
  description: string;

  status: ProblemStatus;
  severity: Severity;
  source: ProblemSource;

  ownerId: string;
  ownerTeamId: string;

  affectedCIIds: string[];
  affectedCIPublicIds: string[];
  affectedServiceIds: string[];

  relatedIncidentIds: string[];
  relatedIncidentCount: number;
  firstIncidentDate?: string;
  lastIncidentDate?: string;

  rca?: RCAAnalysis;

  knownError?: {
    publishedAt: string;
    publishedBy: string;
    rootCause: string;
    workaround: string;
    workaroundEffectiveness: 'full' | 'partial' | 'none';
    affectedVersions?: string;
    permanentFixPlan?: string;
  };

  linkedChangeIds: string[];
  linkedKBArticleIds: string[];

  tags: string[];

  createdAt: string;
  updatedAt: string;
  closedAt?: string;
}
