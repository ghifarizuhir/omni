import { CIType, CIStatus, Environment, Criticality, RelationshipType, CIAttributes } from './ci';
import { ServiceHealthStatus } from './common';

// ============================================================
// AI SESSION & MESSAGES
// ============================================================

export type AiDomain =
  | 'cmdb'
  | 'knowledge_base'
  | 'incident'
  | 'problem'
  | 'change'
  | 'all';

export type AiMessageRole = 'user' | 'ai';

export type AiMessageContentType =
  | 'text'
  | 'draft_ci'
  | 'draft_kb'
  | 'draft_placeholder'
  | 'query_result_ci'
  | 'query_result_text'
  | 'suggestion';

export interface AiMessage {
  id: string;
  sessionId: string;
  role: AiMessageRole;
  createdAt: string;
  text?: string;
  contentType?: AiMessageContentType;
  contentPayload?: AiDraftCIPayload | AiDraftKBPayload | AiQueryResultCIPayload | AiQueryResultTextPayload | AiSuggestionPayload;
}

// ============================================================
// DRAFT PAYLOADS
// ============================================================

export type AiDraftStatus = 'pending' | 'confirmed' | 'cancelled';

export interface AiDraftCIPayload {
  kind: 'draft_ci';
  draftStatus: AiDraftStatus;
  publicId: string;
  name: string;
  type: CIType;
  status: CIStatus;
  environment: Environment;
  criticality: Criticality;
  ownerTeamId: string;
  ownerId?: string;
  tags: string[];
  attributes: Partial<CIAttributes>;
  relationships: Array<{
    type: RelationshipType;
    targetCiPublicId: string;
    targetCiName: string;
    addedByUser: boolean;
  }>;
  pendingSuggestions: Array<{
    id: string;
    text: string;
    actionType: 'add_relationship' | 'set_field';
    actionPayload: Record<string, unknown>;
  }>;
}

export interface AiDraftKBPayload {
  kind: 'draft_kb';
  draftStatus: AiDraftStatus;
  title: string;
  category: string;
  tags: string[];
  relatedCiPublicIds: string[];
  sections: Array<{
    heading: string;
    body: string;
  }>;
  pendingSuggestions: Array<{
    id: string;
    text: string;
    actionType: 'add_related_ci' | 'add_tag' | 'add_section';
    actionPayload: Record<string, unknown>;
  }>;
}

// ============================================================
// QUERY RESULT PAYLOADS
// ============================================================

export interface AiQueryResultCIPayload {
  kind: 'query_result_ci';
  query: string;
  totalFound: number;
  items: Array<{
    publicId: string;
    name: string;
    type: CIType;
    health: ServiceHealthStatus;
    criticality: Criticality;
    openIncidentCount: number;
    detailUrl: string;
  }>;
  timestamp: string;
}

export interface AiQueryResultTextPayload {
  kind: 'query_result_text';
  query: string;
  answer: string;
  timestamp: string;
}

export interface AiSuggestionPayload {
  kind: 'suggestion';
  text: string;
  actionLabel: string;
  actionType: string;
}

// ============================================================
// SESSION
// ============================================================

export interface AiSession {
  id: string;
  domain: AiDomain;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: AiMessage[];
  draftsPending: number;
  draftsConfirmed: number;
}

// ============================================================
// PANEL STATE (Quick Assist)
// ============================================================

export interface AiPanelContext {
  detectedDomain: AiDomain;
  sourcePath: string;
  sourceLabel: string;
}
