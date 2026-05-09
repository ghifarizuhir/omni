import { GenericStatus } from './common';

export type CatalogCategory =
  | 'access'
  | 'equipment'
  | 'software'
  | 'communication'
  | 'personnel'
  | 'general';

export type RequestStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'in_fulfillment'
  | 'pending_user'
  | 'fulfilled'
  | 'closed'
  | 'rejected'
  | 'cancelled';

export type WorkflowStepStatus = 'pending' | 'active' | 'completed' | 'skipped' | 'rejected';

export type ApprovalDecision = 'pending' | 'approved' | 'rejected';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'date'
  | 'user_picker'
  | 'ci_picker'
  | 'file_upload'
  | 'checkbox';

export interface CatalogItem {
  id: string;
  publicId: string;
  name: string;
  shortDescription: string;
  description: string;
  category: CatalogCategory;
  iconName: string;
  estimatedFulfillmentDays: number;
  cost?: { amount: number; currency: string };
  ownerTeamId: string;
  popularity: number;
  formFields: FormField[];
  workflowTemplate: WorkflowStepTemplate[];
  linkedKBSlugs: string[];
  tags: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  helpText?: string;
  placeholder?: string;
  defaultValue?: string | number | boolean;
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  showWhen?: { fieldId: string; value: string | number | boolean };
}

export interface WorkflowStepTemplate {
  id: string;
  name: string;
  type: 'approval' | 'task' | 'automated';
  description?: string;
  approverType?: 'user' | 'team' | 'manager_of_requester' | 'service_owner';
  approverId?: string;
  assigneeType?: 'team' | 'role';
  assigneeId?: string;
  slaHours: number;
}

export interface ServiceRequest {
  id: string;
  publicId: string;
  catalogItemId: string;
  catalogItemPublicId: string;
  catalogItemName: string;
  catalogCategory: CatalogCategory;
  title: string;
  description?: string;
  status: RequestStatus;
  priority: 'low' | 'normal' | 'high';
  requesterId: string;
  requesterName: string;
  requesterTeamId?: string;
  formData: Record<string, string | number | boolean | string[]>;
  workflow: WorkflowInstance;
  approvals: Approval[];
  assigneeId?: string;
  assigneeName?: string;
  totalSlaHours: number;
  slaBreached: boolean;
  estimatedCompletion: string;
  submittedAt?: string;
  approvedAt?: string;
  fulfilledAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
  linkedChangeId?: string;
  linkedKBSlugs: string[];
  commentCount: number;
  tags: string[];
}

export interface WorkflowInstance {
  id: string;
  currentStepIndex: number;
  steps: WorkflowStepInstance[];
}

export interface WorkflowStepInstance {
  id: string;
  templateId: string;
  name: string;
  type: 'approval' | 'task' | 'automated';
  description?: string;
  status: WorkflowStepStatus;
  startedAt?: string;
  completedAt?: string;
  assigneeId?: string;
  assigneeName?: string;
  decision?: ApprovalDecision;
  decisionNote?: string;
  decidedAt?: string;
  decidedBy?: string;
  slaHours: number;
  slaStatus: 'healthy' | 'warning' | 'breached';
}

export interface Approval {
  id: string;
  stepId: string;
  approverId: string;
  approverName: string;
  decision: ApprovalDecision;
  note?: string;
  decidedAt?: string;
  delegated?: { fromUserId: string; toUserId: string; reason?: string };
}
