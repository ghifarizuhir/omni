import { apiFetch } from './core';
import type {
  User, Team, KBArticle, KBCategory, KBStatus, TestPlan, TestCase, TestRun, SignOff,
  AiSession, DRPlan, DRTestRun, BIAEntry,
} from '../types';
import type {
  CreateKBArticleInput, UpdateKBArticleInput,
} from '../shared/schemas/kbArticle';
import type {
  NotificationItem, NotificationPreference, QuietHoursConfig,
  LegacyInboxItem, InboxItem,
  OnCallSchedule, OnCallOverride,
  StatusPageEntry, StatusPageIncident,
} from '../types/platform';
import type { KBFeedback, KBAnalytics } from '../types/knowledge';
import type {
  Division, Department, RbacTeam, Application, FunctionalRole, RbacUser,
} from '../types/rbac';
import type { Report, MeasurementDashboard, MetricDefinition } from '../types/measurement';
import type { BenefitMeasurement, ROICalculation } from '../types/improvement';

export const usersService = {
  list: () => apiFetch<User[]>('/users'),
  get: (id: string) => apiFetch<User>(`/users/${id}`),
  current: () => apiFetch<User>('/users/me'),
};

export interface ApiTokenSummary {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt?: string | null;
}

export interface ApiTokenCreated extends ApiTokenSummary {
  token: string;
}

export const apiTokensService = {
  list: () => apiFetch<ApiTokenSummary[]>('/users/me/tokens'),
  create: (name: string) =>
    apiFetch<ApiTokenCreated>('/users/me/tokens', { method: 'POST', body: { name } }),
  revoke: (id: string) =>
    apiFetch<void>(`/users/me/tokens/${id}`, { method: 'DELETE' }),
};

export interface NotificationChannelRow {
  id: string;
  kind: 'email' | 'sms' | 'slack';
  address: string;
  verified: boolean;
}

export const userChannelsService = {
  list: () => apiFetch<NotificationChannelRow[]>('/users/me/channels'),
  upsert: (kind: 'email' | 'sms' | 'slack', address: string) =>
    apiFetch<NotificationChannelRow>(`/users/me/channels/${kind}`, { method: 'PUT', body: { address } }),
};

export const teamsService = {
  list: () => apiFetch<Team[]>('/teams'),
  get: (id: string) => apiFetch<Team>(`/teams/${id}`),
};

export const notificationsService = {
  list: () => apiFetch<NotificationItem[]>('/notifications'),
  preferences: () => apiFetch<NotificationPreference[]>('/notifications/preferences'),
  quietHours: () => apiFetch<QuietHoursConfig>('/notifications/quiet-hours'),
};

export const inboxService = {
  feed: () => apiFetch<LegacyInboxItem[]>('/inbox'),
  items: () => apiFetch<InboxItem[]>('/inbox/items'),
};

export const onCallService = {
  schedules: () => apiFetch<OnCallSchedule[]>('/on-call/schedules'),
  overrides: () => apiFetch<OnCallOverride[]>('/on-call/overrides'),
};

export const knowledgeService = {
  articles: () => apiFetch<KBArticle[]>('/kb/articles'),
  article: (publicId: string) => apiFetch<KBArticle>(`/kb/articles/${publicId}`),
  categories: () => apiFetch<KBCategory[]>('/kb/categories'),
  feedback: (articleId?: string) => apiFetch<KBFeedback[]>('/kb/feedback', { query: { articleId } }),
  analytics: () => apiFetch<KBAnalytics>('/kb/analytics'),

  // M6.11 (B1.5) — KB article writes. Create starts in draft; status changes
  // go through the dedicated setStatus endpoint so the server can stamp
  // publishedAt/By and enforce same-status / terminal-state guards.
  create: (input: CreateKBArticleInput) =>
    apiFetch<KBArticle>('/kb/articles', { method: 'POST', body: input }),
  update: (publicId: string, patch: UpdateKBArticleInput) =>
    apiFetch<KBArticle>(`/kb/articles/${publicId}`, { method: 'PATCH', body: patch }),
  setStatus: (publicId: string, status: KBStatus) =>
    apiFetch<KBArticle>(`/kb/articles/${publicId}/status`, { method: 'PATCH', body: { status } }),
};

export const testingService = {
  plans: () => apiFetch<TestPlan[]>('/testing/plans'),
  cases: (planId?: string) => apiFetch<TestCase[]>('/testing/cases', { query: { planId } }),
  runs: () => apiFetch<TestRun[]>('/testing/runs'),
  activeRuns: () => apiFetch<TestRun[]>('/testing/runs', { query: { active: true } }),
  signOffs: () => apiFetch<SignOff[]>('/testing/sign-offs'),
};

export const statusPageService = {
  entries: () => apiFetch<StatusPageEntry[]>('/status-page/entries'),
  incidents: () => apiFetch<StatusPageIncident[]>('/status-page/incidents'),
};

export const aiService = {
  sessions: () => apiFetch<AiSession[]>('/ai/sessions'),
  session: (id: string) => apiFetch<AiSession>(`/ai/sessions/${id}`),
  activeSession: () => apiFetch<AiSession | null>('/ai/sessions/active'),
  messages: (sessionId: string) =>
    apiFetch<Array<{ id: string; role: 'user' | 'assistant'; body: string; createdAt: string }>>(
      `/ai/sessions/${sessionId}/messages`
    ),
  sendMessage: (sessionId: string, body: string) =>
    apiFetch<{
      user: { id: string; role: 'user'; body: string; createdAt: string };
      assistant: { id: string; role: 'assistant'; body: string; createdAt: string };
    }>(`/ai/sessions/${sessionId}/messages`, { method: 'POST', body: { body } }),
};

export const rbacService = {
  users: () => apiFetch<RbacUser[]>('/rbac/users'),
  teams: () => apiFetch<RbacTeam[]>('/rbac/teams'),
  applications: () => apiFetch<Application[]>('/rbac/applications'),
  departments: () => apiFetch<Department[]>('/rbac/departments'),
  divisions: () => apiFetch<Division[]>('/rbac/divisions'),
  roles: () => apiFetch<FunctionalRole[]>('/rbac/roles'),

  upsertDivision: (d: Division) =>
    apiFetch<Division>(`/admin/rbac/divisions/${d.id}`, { method: 'PUT', body: d }),
  deleteDivision: (id: string) =>
    apiFetch<void>(`/admin/rbac/divisions/${id}`, { method: 'DELETE' }),

  upsertDepartment: (d: Department) =>
    apiFetch<Department>(`/admin/rbac/departments/${d.id}`, { method: 'PUT', body: d }),
  deleteDepartment: (id: string) =>
    apiFetch<void>(`/admin/rbac/departments/${id}`, { method: 'DELETE' }),

  upsertTeam: (t: RbacTeam) =>
    apiFetch<RbacTeam>(`/admin/rbac/teams/${t.id}`, { method: 'PUT', body: t }),
  deleteTeam: (id: string) =>
    apiFetch<void>(`/admin/rbac/teams/${id}`, { method: 'DELETE' }),

  upsertApplication: (a: Application) =>
    apiFetch<Application>(`/admin/rbac/applications/${a.id}`, { method: 'PUT', body: a }),
  deleteApplication: (id: string) =>
    apiFetch<void>(`/admin/rbac/applications/${id}`, { method: 'DELETE' }),

  upsertFunctionalRole: (r: FunctionalRole) =>
    apiFetch<FunctionalRole>(`/admin/rbac/roles/${r.id}`, { method: 'PUT', body: r }),
  deleteFunctionalRole: (id: string) =>
    apiFetch<void>(`/admin/rbac/roles/${id}`, { method: 'DELETE' }),

  upsertRbacUser: (u: RbacUser) =>
    apiFetch<RbacUser>(`/admin/rbac/users/${u.id}`, { method: 'PUT', body: u }),
  deleteRbacUser: (id: string) =>
    apiFetch<void>(`/admin/rbac/users/${id}`, { method: 'DELETE' }),
};

export const continuityService = {
  drPlans: () => apiFetch<DRPlan[]>('/continuity/dr-plans'),
  drRuns: () => apiFetch<DRTestRun[]>('/continuity/dr-runs'),
  bia: () => apiFetch<BIAEntry[]>('/continuity/bia'),
};

export const measurementService = {
  reports: () => apiFetch<Report[]>('/measurement/reports'),
  roi: () => apiFetch<ROICalculation[]>('/measurement/roi'),
  benefits: () => apiFetch<BenefitMeasurement[]>('/measurement/benefits'),
  dashboards: () => apiFetch<MeasurementDashboard[]>('/measurement/dashboards'),
  metrics: () => apiFetch<MetricDefinition[]>('/measurement/metrics'),
  execSummary: () => apiFetch<{
    slaCompliancePct: number;
    mttrMinutes: number;
    changeSuccessPct: number;
    openMajorIncidents: number;
  }>('/measurement/exec-summary'),
  createReport: (input: { name: string; definition?: unknown; schedule?: unknown }) =>
    apiFetch<Report>('/measurement/reports', { method: 'POST', body: input }),
};
