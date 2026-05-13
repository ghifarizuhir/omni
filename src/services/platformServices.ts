// Platform-wide services: users, teams, notifications, inbox, on-call, KB,
// testing, status page, AI, RBAC, continuity, measurement.

import { mockUsers, currentUser } from '../mocks/users';
import { mockTeams } from '../mocks/teams';
import { legacyMockInboxItems } from '../mocks/inbox';
import { mockInboxItems } from '../mocks/inboxItems';
import { mockNotifications } from '../mocks/notifications';
import { mockNotificationPreferences, mockQuietHours } from '../mocks/notificationPreferences';
import { mockOnCallSchedules } from '../mocks/onCallSchedules';
import { mockOnCallOverrides } from '../mocks/onCallOverrides';
import { mockKBArticles } from '../mocks/kbArticles';
import { mockKBCategories } from '../mocks/kbCategories';
import { mockKBFeedback } from '../mocks/kbFeedback';
import { kbAnalytics as mockKBAnalytics } from '../mocks/kbAnalytics';
import { mockTestPlans } from '../mocks/testPlans';
import { mockTestCases } from '../mocks/testCases';
import { mockTestRuns, getActiveTestRuns } from '../mocks/testRuns';
import { mockSignOffs } from '../mocks/signOffs';
import { mockStatusPageEntries, mockStatusPageIncidents } from '../mocks/statusPageEntries';
import { mockAiSessions, getActiveSession, getSessionById } from '../mocks/aiSessions';
import { mockRbacUsers, mockRbacTeams, mockApplications, mockDepartments, mockDivisions, mockFunctionalRoles } from '../mocks/rbac';
import { mockDRPlans } from '../mocks/drPlans';
import { mockDRTestRuns } from '../mocks/drTestRuns';
import { mockBIAEntries } from '../mocks/biaEntries';
import { mockReports } from '../mocks/reports';
import { mockROICalculations } from '../mocks/roiCalculations';
import { mockBenefitMeasurements } from '../mocks/benefitMeasurements';
import { mockMeasurementDashboards } from '../mocks/measurementDashboards';
import { mockMetricDefinitions } from '../mocks/metricDefinitions';
import { apiFetch, isLive, mockRequired, mockResult } from './core';
import type {
  User, Team, KBArticle, KBCategory, TestPlan, TestCase, TestRun, SignOff,
  AiSession, DRPlan, DRTestRun, BIAEntry,
} from '../types';

export const usersService = {
  list(): Promise<User[]> {
    if (isLive()) return apiFetch<User[]>('/users');
    return mockResult(mockUsers);
  },
  get(id: string): Promise<User> {
    if (isLive()) return apiFetch<User>(`/users/${id}`);
    return mockRequired(mockUsers.find(u => u.id === id), 'User');
  },
  current(): Promise<User> {
    if (isLive()) return apiFetch<User>('/users/me');
    return mockResult(currentUser);
  },
};

export const teamsService = {
  list(): Promise<Team[]> {
    if (isLive()) return apiFetch<Team[]>('/teams');
    return mockResult(mockTeams);
  },
  get(id: string): Promise<Team> {
    if (isLive()) return apiFetch<Team>(`/teams/${id}`);
    return mockRequired(mockTeams.find(t => t.id === id), 'Team');
  },
};

export const notificationsService = {
  list(): Promise<typeof mockNotifications> {
    if (isLive()) return apiFetch('/notifications');
    return mockResult(mockNotifications);
  },
  preferences(): Promise<typeof mockNotificationPreferences> {
    if (isLive()) return apiFetch('/notifications/preferences');
    return mockResult(mockNotificationPreferences);
  },
  quietHours(): Promise<typeof mockQuietHours> {
    if (isLive()) return apiFetch('/notifications/quiet-hours');
    return mockResult(mockQuietHours);
  },
};

export const inboxService = {
  feed(): Promise<typeof legacyMockInboxItems> {
    if (isLive()) return apiFetch('/inbox');
    return mockResult(legacyMockInboxItems);
  },
  items(): Promise<typeof mockInboxItems> {
    if (isLive()) return apiFetch('/inbox/items');
    return mockResult(mockInboxItems);
  },
};

export const onCallService = {
  schedules(): Promise<typeof mockOnCallSchedules> {
    if (isLive()) return apiFetch('/on-call/schedules');
    return mockResult(mockOnCallSchedules);
  },
  overrides(): Promise<typeof mockOnCallOverrides> {
    if (isLive()) return apiFetch('/on-call/overrides');
    return mockResult(mockOnCallOverrides);
  },
};

export const knowledgeService = {
  articles(): Promise<KBArticle[]> {
    if (isLive()) return apiFetch<KBArticle[]>('/kb/articles');
    return mockResult(mockKBArticles);
  },
  article(publicId: string): Promise<KBArticle> {
    if (isLive()) return apiFetch<KBArticle>(`/kb/articles/${publicId}`);
    return mockRequired(mockKBArticles.find(a => a.publicId === publicId), 'KBArticle');
  },
  categories(): Promise<KBCategory[]> {
    if (isLive()) return apiFetch<KBCategory[]>('/kb/categories');
    return mockResult(mockKBCategories);
  },
  feedback(articleId?: string): Promise<typeof mockKBFeedback> {
    if (isLive()) return apiFetch('/kb/feedback', { query: { articleId } });
    return mockResult(articleId ? mockKBFeedback.filter(f => f.articleId === articleId) : mockKBFeedback);
  },
  analytics(): Promise<typeof mockKBAnalytics> {
    if (isLive()) return apiFetch('/kb/analytics');
    return mockResult(mockKBAnalytics);
  },
};

export const testingService = {
  plans(): Promise<TestPlan[]> {
    if (isLive()) return apiFetch<TestPlan[]>('/testing/plans');
    return mockResult(mockTestPlans);
  },
  cases(planId?: string): Promise<TestCase[]> {
    if (isLive()) return apiFetch<TestCase[]>('/testing/cases', { query: { planId } });
    return mockResult(planId ? mockTestCases.filter(c => c.containedInPlans.includes(planId)) : mockTestCases);
  },
  runs(): Promise<TestRun[]> {
    if (isLive()) return apiFetch<TestRun[]>('/testing/runs');
    return mockResult(mockTestRuns);
  },
  activeRuns(): Promise<TestRun[]> {
    if (isLive()) return apiFetch<TestRun[]>('/testing/runs', { query: { active: true } });
    return mockResult(getActiveTestRuns());
  },
  signOffs(): Promise<SignOff[]> {
    if (isLive()) return apiFetch<SignOff[]>('/testing/sign-offs');
    return mockResult(mockSignOffs);
  },
};

export const statusPageService = {
  entries(): Promise<typeof mockStatusPageEntries> {
    if (isLive()) return apiFetch('/status-page/entries');
    return mockResult(mockStatusPageEntries);
  },
  incidents(): Promise<typeof mockStatusPageIncidents> {
    if (isLive()) return apiFetch('/status-page/incidents');
    return mockResult(mockStatusPageIncidents);
  },
};

export const aiService = {
  sessions(): Promise<AiSession[]> {
    if (isLive()) return apiFetch<AiSession[]>('/ai/sessions');
    return mockResult(mockAiSessions);
  },
  session(id: string): Promise<AiSession> {
    if (isLive()) return apiFetch<AiSession>(`/ai/sessions/${id}`);
    return mockRequired(getSessionById(id), 'AiSession');
  },
  activeSession(): Promise<AiSession | null> {
    if (isLive()) return apiFetch<AiSession | null>('/ai/sessions/active');
    return mockResult(getActiveSession() ?? null);
  },
};

export const rbacService = {
  users():        Promise<typeof mockRbacUsers>       { return isLive() ? apiFetch('/rbac/users')        : mockResult(mockRbacUsers); },
  teams():        Promise<typeof mockRbacTeams>       { return isLive() ? apiFetch('/rbac/teams')        : mockResult(mockRbacTeams); },
  applications(): Promise<typeof mockApplications>    { return isLive() ? apiFetch('/rbac/applications') : mockResult(mockApplications); },
  departments():  Promise<typeof mockDepartments>     { return isLive() ? apiFetch('/rbac/departments')  : mockResult(mockDepartments); },
  divisions():    Promise<typeof mockDivisions>       { return isLive() ? apiFetch('/rbac/divisions')    : mockResult(mockDivisions); },
  roles():        Promise<typeof mockFunctionalRoles> { return isLive() ? apiFetch('/rbac/roles')        : mockResult(mockFunctionalRoles); },
};

export const continuityService = {
  drPlans(): Promise<DRPlan[]> {
    if (isLive()) return apiFetch<DRPlan[]>('/continuity/dr-plans');
    return mockResult(mockDRPlans);
  },
  drRuns(): Promise<DRTestRun[]> {
    if (isLive()) return apiFetch<DRTestRun[]>('/continuity/dr-runs');
    return mockResult(mockDRTestRuns);
  },
  bia(): Promise<BIAEntry[]> {
    if (isLive()) return apiFetch<BIAEntry[]>('/continuity/bia');
    return mockResult(mockBIAEntries);
  },
};

export const measurementService = {
  reports():      Promise<typeof mockReports>                { return isLive() ? apiFetch('/measurement/reports')       : mockResult(mockReports); },
  roi():          Promise<typeof mockROICalculations>        { return isLive() ? apiFetch('/measurement/roi')           : mockResult(mockROICalculations); },
  benefits():     Promise<typeof mockBenefitMeasurements>    { return isLive() ? apiFetch('/measurement/benefits')      : mockResult(mockBenefitMeasurements); },
  dashboards():   Promise<typeof mockMeasurementDashboards>  { return isLive() ? apiFetch('/measurement/dashboards')    : mockResult(mockMeasurementDashboards); },
  metrics():      Promise<typeof mockMetricDefinitions>      { return isLive() ? apiFetch('/measurement/metrics')       : mockResult(mockMetricDefinitions); },
};
