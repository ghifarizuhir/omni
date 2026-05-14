import { apiFetch } from './core';
import type {
  User, Team, KBArticle, KBCategory, TestPlan, TestCase, TestRun, SignOff,
  AiSession, DRPlan, DRTestRun, BIAEntry,
} from '../types';
// Pull shape information from the mock modules so route components keep their
// strong typing for the catch-all endpoints (notifications, on-call, etc).
import type { mockNotifications } from '../mocks/notifications';
import type {
  mockNotificationPreferences, mockQuietHours,
} from '../mocks/notificationPreferences';
import type { legacyMockInboxItems } from '../mocks/inbox';
import type { mockInboxItems } from '../mocks/inboxItems';
import type { mockOnCallSchedules } from '../mocks/onCallSchedules';
import type { mockOnCallOverrides } from '../mocks/onCallOverrides';
import type { mockKBFeedback } from '../mocks/kbFeedback';
import type { kbAnalytics } from '../mocks/kbAnalytics';
import type {
  mockStatusPageEntries, mockStatusPageIncidents,
} from '../mocks/statusPageEntries';
import type {
  mockRbacUsers, mockRbacTeams, mockApplications,
  mockDepartments, mockDivisions, mockFunctionalRoles,
} from '../mocks/rbac';
import type { mockReports } from '../mocks/reports';
import type { mockROICalculations } from '../mocks/roiCalculations';
import type { mockBenefitMeasurements } from '../mocks/benefitMeasurements';
import type { mockMeasurementDashboards } from '../mocks/measurementDashboards';
import type { mockMetricDefinitions } from '../mocks/metricDefinitions';

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
  list: () => apiFetch<typeof mockNotifications>('/notifications'),
  preferences: () => apiFetch<typeof mockNotificationPreferences>('/notifications/preferences'),
  quietHours: () => apiFetch<typeof mockQuietHours>('/notifications/quiet-hours'),
};

export const inboxService = {
  feed: () => apiFetch<typeof legacyMockInboxItems>('/inbox'),
  items: () => apiFetch<typeof mockInboxItems>('/inbox/items'),
};

export const onCallService = {
  schedules: () => apiFetch<typeof mockOnCallSchedules>('/on-call/schedules'),
  overrides: () => apiFetch<typeof mockOnCallOverrides>('/on-call/overrides'),
};

export const knowledgeService = {
  articles: () => apiFetch<KBArticle[]>('/kb/articles'),
  article: (publicId: string) => apiFetch<KBArticle>(`/kb/articles/${publicId}`),
  categories: () => apiFetch<KBCategory[]>('/kb/categories'),
  feedback: (articleId?: string) => apiFetch<typeof mockKBFeedback>('/kb/feedback', { query: { articleId } }),
  analytics: () => apiFetch<typeof kbAnalytics>('/kb/analytics'),
};

export const testingService = {
  plans: () => apiFetch<TestPlan[]>('/testing/plans'),
  cases: (planId?: string) => apiFetch<TestCase[]>('/testing/cases', { query: { planId } }),
  runs: () => apiFetch<TestRun[]>('/testing/runs'),
  activeRuns: () => apiFetch<TestRun[]>('/testing/runs', { query: { active: true } }),
  signOffs: () => apiFetch<SignOff[]>('/testing/sign-offs'),
};

export const statusPageService = {
  entries: () => apiFetch<typeof mockStatusPageEntries>('/status-page/entries'),
  incidents: () => apiFetch<typeof mockStatusPageIncidents>('/status-page/incidents'),
};

export const aiService = {
  sessions: () => apiFetch<AiSession[]>('/ai/sessions'),
  session: (id: string) => apiFetch<AiSession>(`/ai/sessions/${id}`),
  activeSession: () => apiFetch<AiSession | null>('/ai/sessions/active'),
};

export const rbacService = {
  users: () => apiFetch<typeof mockRbacUsers>('/rbac/users'),
  teams: () => apiFetch<typeof mockRbacTeams>('/rbac/teams'),
  applications: () => apiFetch<typeof mockApplications>('/rbac/applications'),
  departments: () => apiFetch<typeof mockDepartments>('/rbac/departments'),
  divisions: () => apiFetch<typeof mockDivisions>('/rbac/divisions'),
  roles: () => apiFetch<typeof mockFunctionalRoles>('/rbac/roles'),
};

export const continuityService = {
  drPlans: () => apiFetch<DRPlan[]>('/continuity/dr-plans'),
  drRuns: () => apiFetch<DRTestRun[]>('/continuity/dr-runs'),
  bia: () => apiFetch<BIAEntry[]>('/continuity/bia'),
};

export const measurementService = {
  reports: () => apiFetch<typeof mockReports>('/measurement/reports'),
  roi: () => apiFetch<typeof mockROICalculations>('/measurement/roi'),
  benefits: () => apiFetch<typeof mockBenefitMeasurements>('/measurement/benefits'),
  dashboards: () => apiFetch<typeof mockMeasurementDashboards>('/measurement/dashboards'),
  metrics: () => apiFetch<typeof mockMetricDefinitions>('/measurement/metrics'),
};
