// Seeds the generic Document store for catalog/snapshot domains that don't
// warrant their own table. Imported from `prisma/seed.ts`.

import type { PrismaClient } from '@prisma/client';

// Source mocks
import { mockTeams } from '../src/mocks/teams';
import { mockNotifications } from '../src/mocks/notifications';
import { mockNotificationPreferences, mockQuietHours } from '../src/mocks/notificationPreferences';
import { legacyMockInboxItems } from '../src/mocks/inbox';
import { mockInboxItems } from '../src/mocks/inboxItems';
import { mockOnCallSchedules } from '../src/mocks/onCallSchedules';
import { mockOnCallOverrides } from '../src/mocks/onCallOverrides';
import { mockOutages } from '../src/mocks/outages';
import { mockSLATargets } from '../src/mocks/slaTargets';
import { mockSLABreaches } from '../src/mocks/slaBreaches';
import { mockDailyServiceHealth } from '../src/mocks/dailyServiceHealth';
import { mockAvailabilityData } from '../src/mocks/availabilityData';
import { mockCapacityMetrics } from '../src/mocks/capacityMetrics';
import { mockCapacityThresholds } from '../src/mocks/capacityThresholds';
import { mockCapacityForecasts } from '../src/mocks/capacityForecasts';
import { mockCapacityTimeSeries } from '../src/mocks/capacityTimeSeries';
import { mockScalingRecommendations } from '../src/mocks/scalingRecommendations';
import { mockTestPlans } from '../src/mocks/testPlans';
import { mockTestCases } from '../src/mocks/testCases';
import { mockTestRuns } from '../src/mocks/testRuns';
import { mockSignOffs } from '../src/mocks/signOffs';
import { mockStatusPageEntries, mockStatusPageIncidents } from '../src/mocks/statusPageEntries';
import { mockAiSessions } from '../src/mocks/aiSessions';
import {
  mockRbacUsers, mockRbacTeams, mockApplications,
  mockDepartments, mockDivisions, mockFunctionalRoles,
} from '../src/mocks/rbac';
import { mockDRPlans } from '../src/mocks/drPlans';
import { mockDRTestRuns } from '../src/mocks/drTestRuns';
import { mockBIAEntries } from '../src/mocks/biaEntries';
import { mockReports } from '../src/mocks/reports';
import { mockROICalculations } from '../src/mocks/roiCalculations';
import { mockBenefitMeasurements } from '../src/mocks/benefitMeasurements';
import { mockMeasurementDashboards } from '../src/mocks/measurementDashboards';
import { mockMetricDefinitions } from '../src/mocks/metricDefinitions';
import { mockEnvironments } from '../src/mocks/environments';
import { mockKBCategories } from '../src/mocks/kbCategories';
import { mockKBFeedback } from '../src/mocks/kbFeedback';
import { kbAnalytics } from '../src/mocks/kbAnalytics';
import { mockImprovements } from '../src/mocks/improvements';
import { mockKBArticles } from '../src/mocks/kbArticles';

// Source data shapes vary widely; treat each as an opaque object and lift the
// optional `id`/`publicId` out at runtime.
type AnyItem = Record<string, unknown>;

const buildBatch = (tenantId: string, kind: string, items: ReadonlyArray<unknown>) =>
  items.map((raw, idx) => {
    const it = raw as AnyItem;
    return {
      tenantId,
      kind,
      key: typeof it.id === 'string' ? it.id : `${kind}-${idx}`,
      publicId: typeof it.publicId === 'string' ? it.publicId : null,
      data: JSON.stringify(it),
      position: idx,
    };
  });

export const seedDocuments = async (prisma: PrismaClient, tenantId: string) => {
  const batches: Array<{ kind: string; items: ReadonlyArray<unknown> }> = [
    { kind: 'team', items: mockTeams },
    { kind: 'notification', items: mockNotifications },
    { kind: 'notification-pref', items: mockNotificationPreferences },
    { kind: 'quiet-hours', items: [mockQuietHours] },
    { kind: 'inbox-legacy', items: legacyMockInboxItems },
    { kind: 'inbox-item', items: mockInboxItems },
    { kind: 'on-call-schedule', items: mockOnCallSchedules },
    { kind: 'on-call-override', items: mockOnCallOverrides },
    { kind: 'outage', items: mockOutages },
    { kind: 'sla-target', items: mockSLATargets },
    { kind: 'sla-breach', items: mockSLABreaches },
    { kind: 'daily-health', items: mockDailyServiceHealth },
    { kind: 'availability-series', items: mockAvailabilityData },
    { kind: 'capacity-metric', items: mockCapacityMetrics },
    { kind: 'capacity-threshold', items: mockCapacityThresholds },
    { kind: 'capacity-forecast', items: mockCapacityForecasts },
    { kind: 'capacity-time-series', items: mockCapacityTimeSeries },
    { kind: 'scaling-rec', items: mockScalingRecommendations },
    { kind: 'test-plan', items: mockTestPlans },
    { kind: 'test-case', items: mockTestCases },
    { kind: 'test-run', items: mockTestRuns },
    { kind: 'sign-off', items: mockSignOffs },
    { kind: 'status-page-entry', items: mockStatusPageEntries },
    { kind: 'status-page-incident', items: mockStatusPageIncidents },
    { kind: 'ai-session', items: mockAiSessions },
    { kind: 'rbac-user', items: mockRbacUsers },
    { kind: 'rbac-team', items: mockRbacTeams },
    { kind: 'rbac-application', items: mockApplications },
    { kind: 'rbac-department', items: mockDepartments },
    { kind: 'rbac-division', items: mockDivisions },
    { kind: 'rbac-role', items: mockFunctionalRoles },
    { kind: 'dr-plan', items: mockDRPlans },
    { kind: 'dr-run', items: mockDRTestRuns },
    { kind: 'bia', items: mockBIAEntries },
    { kind: 'report', items: mockReports },
    { kind: 'roi-calc', items: mockROICalculations },
    { kind: 'benefit-measurement', items: mockBenefitMeasurements },
    { kind: 'measurement-dashboard', items: mockMeasurementDashboards },
    { kind: 'metric-def', items: mockMetricDefinitions },
    { kind: 'environment', items: mockEnvironments },
    { kind: 'kb-category', items: mockKBCategories },
    { kind: 'kb-feedback', items: mockKBFeedback },
    { kind: 'kb-analytics', items: [kbAnalytics] },
    { kind: 'improvement', items: mockImprovements },
  ];

  // KB articles already have their own table but we also surface tag/category
  // through documents — skip duplication.
  void mockKBArticles;

  for (const b of batches) {
    if (!b.items.length) continue;
    await prisma.document.createMany({ data: buildBatch(tenantId, b.kind, b.items) });
  }
};
