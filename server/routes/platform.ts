import { Router } from 'express';
import { mockUsers, currentUser } from '../../src/mocks/users';
import { mockTeams } from '../../src/mocks/teams';
import { legacyMockInboxItems } from '../../src/mocks/inbox';
import { mockInboxItems } from '../../src/mocks/inboxItems';
import { mockNotifications } from '../../src/mocks/notifications';
import { mockNotificationPreferences, mockQuietHours } from '../../src/mocks/notificationPreferences';
import { mockOnCallSchedules } from '../../src/mocks/onCallSchedules';
import { mockOnCallOverrides } from '../../src/mocks/onCallOverrides';
import { mockKBArticles } from '../../src/mocks/kbArticles';
import { mockKBCategories } from '../../src/mocks/kbCategories';
import { mockKBFeedback } from '../../src/mocks/kbFeedback';
import { kbAnalytics } from '../../src/mocks/kbAnalytics';
import { mockTestPlans } from '../../src/mocks/testPlans';
import { mockTestCases } from '../../src/mocks/testCases';
import { mockTestRuns, getActiveTestRuns } from '../../src/mocks/testRuns';
import { mockSignOffs } from '../../src/mocks/signOffs';
import { mockStatusPageEntries, mockStatusPageIncidents } from '../../src/mocks/statusPageEntries';
import { mockAiSessions, getActiveSession, getSessionById } from '../../src/mocks/aiSessions';
import {
  mockRbacUsers, mockRbacTeams, mockApplications, mockDepartments, mockDivisions, mockFunctionalRoles,
} from '../../src/mocks/rbac';
import { mockDRPlans } from '../../src/mocks/drPlans';
import { mockDRTestRuns } from '../../src/mocks/drTestRuns';
import { mockBIAEntries } from '../../src/mocks/biaEntries';
import { mockReports } from '../../src/mocks/reports';
import { mockROICalculations } from '../../src/mocks/roiCalculations';
import { mockBenefitMeasurements } from '../../src/mocks/benefitMeasurements';
import { mockMeasurementDashboards } from '../../src/mocks/measurementDashboards';
import { mockMetricDefinitions } from '../../src/mocks/metricDefinitions';
import { asyncHandler, qBool, qString, required } from '../util';

export const platformRouter = Router();

// users + teams
platformRouter.get('/users', asyncHandler(async (_req, res) => res.json(mockUsers)));
platformRouter.get('/users/me', asyncHandler(async (_req, res) => res.json(currentUser)));
platformRouter.get('/users/:id', asyncHandler(async (req, res) => {
  res.json(required(mockUsers.find(u => u.id === req.params.id), 'User'));
}));
platformRouter.get('/teams', asyncHandler(async (_req, res) => res.json(mockTeams)));
platformRouter.get('/teams/:id', asyncHandler(async (req, res) => {
  res.json(required(mockTeams.find(t => t.id === req.params.id), 'Team'));
}));

// notifications
platformRouter.get('/notifications', asyncHandler(async (_req, res) => res.json(mockNotifications)));
platformRouter.get('/notifications/preferences', asyncHandler(async (_req, res) => res.json(mockNotificationPreferences)));
platformRouter.get('/notifications/quiet-hours', asyncHandler(async (_req, res) => res.json(mockQuietHours)));

// inbox
platformRouter.get('/inbox', asyncHandler(async (_req, res) => res.json(legacyMockInboxItems)));
platformRouter.get('/inbox/items', asyncHandler(async (_req, res) => res.json(mockInboxItems)));

// on-call
platformRouter.get('/on-call/schedules', asyncHandler(async (_req, res) => res.json(mockOnCallSchedules)));
platformRouter.get('/on-call/overrides', asyncHandler(async (_req, res) => res.json(mockOnCallOverrides)));

// knowledge base
platformRouter.get('/kb/articles', asyncHandler(async (_req, res) => res.json(mockKBArticles)));
platformRouter.get('/kb/categories', asyncHandler(async (_req, res) => res.json(mockKBCategories)));
platformRouter.get('/kb/feedback', asyncHandler(async (req, res) => {
  const articleId = qString(req.query.articleId);
  res.json(articleId ? mockKBFeedback.filter(f => f.articleId === articleId) : mockKBFeedback);
}));
platformRouter.get('/kb/analytics', asyncHandler(async (_req, res) => res.json(kbAnalytics)));
platformRouter.get('/kb/articles/:publicId', asyncHandler(async (req, res) => {
  res.json(required(mockKBArticles.find(a => a.publicId === req.params.publicId), 'KBArticle'));
}));

// testing
platformRouter.get('/testing/plans', asyncHandler(async (_req, res) => res.json(mockTestPlans)));
platformRouter.get('/testing/cases', asyncHandler(async (req, res) => {
  const planId = qString(req.query.planId);
  res.json(planId ? mockTestCases.filter(c => c.containedInPlans.includes(planId)) : mockTestCases);
}));
platformRouter.get('/testing/runs', asyncHandler(async (req, res) => {
  res.json(qBool(req.query.active) ? getActiveTestRuns() : mockTestRuns);
}));
platformRouter.get('/testing/sign-offs', asyncHandler(async (_req, res) => res.json(mockSignOffs)));

// status page
platformRouter.get('/status-page/entries', asyncHandler(async (_req, res) => res.json(mockStatusPageEntries)));
platformRouter.get('/status-page/incidents', asyncHandler(async (_req, res) => res.json(mockStatusPageIncidents)));

// AI sessions
platformRouter.get('/ai/sessions', asyncHandler(async (_req, res) => res.json(mockAiSessions)));
platformRouter.get('/ai/sessions/active', asyncHandler(async (_req, res) => res.json(getActiveSession() ?? null)));
platformRouter.get('/ai/sessions/:id', asyncHandler(async (req, res) => {
  res.json(required(getSessionById(req.params.id), 'AiSession'));
}));

// RBAC
platformRouter.get('/rbac/users', asyncHandler(async (_req, res) => res.json(mockRbacUsers)));
platformRouter.get('/rbac/teams', asyncHandler(async (_req, res) => res.json(mockRbacTeams)));
platformRouter.get('/rbac/applications', asyncHandler(async (_req, res) => res.json(mockApplications)));
platformRouter.get('/rbac/departments', asyncHandler(async (_req, res) => res.json(mockDepartments)));
platformRouter.get('/rbac/divisions', asyncHandler(async (_req, res) => res.json(mockDivisions)));
platformRouter.get('/rbac/roles', asyncHandler(async (_req, res) => res.json(mockFunctionalRoles)));

// continuity
platformRouter.get('/continuity/dr-plans', asyncHandler(async (_req, res) => res.json(mockDRPlans)));
platformRouter.get('/continuity/dr-runs', asyncHandler(async (_req, res) => res.json(mockDRTestRuns)));
platformRouter.get('/continuity/bia', asyncHandler(async (_req, res) => res.json(mockBIAEntries)));

// measurement
platformRouter.get('/measurement/reports', asyncHandler(async (_req, res) => res.json(mockReports)));
platformRouter.get('/measurement/roi', asyncHandler(async (_req, res) => res.json(mockROICalculations)));
platformRouter.get('/measurement/benefits', asyncHandler(async (_req, res) => res.json(mockBenefitMeasurements)));
platformRouter.get('/measurement/dashboards', asyncHandler(async (_req, res) => res.json(mockMeasurementDashboards)));
platformRouter.get('/measurement/metrics', asyncHandler(async (_req, res) => res.json(mockMetricDefinitions)));
