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
};

export const rbacService = {
  users: () => apiFetch<RbacUser[]>('/rbac/users'),
  teams: () => apiFetch<RbacTeam[]>('/rbac/teams'),
  applications: () => apiFetch<Application[]>('/rbac/applications'),
  departments: () => apiFetch<Department[]>('/rbac/departments'),
  divisions: () => apiFetch<Division[]>('/rbac/divisions'),
  roles: () => apiFetch<FunctionalRole[]>('/rbac/roles'),
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
};
