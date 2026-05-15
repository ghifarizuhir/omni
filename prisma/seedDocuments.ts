// Seeds the generic Document store for catalog/snapshot domains that don't
// warrant their own table. Imported from `prisma/seed.ts`.

import type { PrismaClient } from '@prisma/client';

// Source mocks
// NOTE: Many mock imports removed during mocks/ cleanup; the remaining ones are still used as type carriers.
import { mockNotifications } from '../src/mocks/notifications';
import { mockNotificationPreferences, mockQuietHours } from '../src/mocks/notificationPreferences';
import { legacyMockInboxItems } from '../src/mocks/inbox';
import { mockInboxItems } from '../src/mocks/inboxItems';
import { mockOnCallSchedules } from '../src/mocks/onCallSchedules';
import { mockOnCallOverrides } from '../src/mocks/onCallOverrides';
import { mockStatusPageEntries, mockStatusPageIncidents } from '../src/mocks/statusPageEntries';
import {
  mockRbacUsers, mockRbacTeams, mockApplications,
  mockDepartments, mockDivisions, mockFunctionalRoles,
} from '../src/mocks/rbac';
import { mockReports } from '../src/mocks/reports';
import { mockROICalculations } from '../src/mocks/roiCalculations';
import { mockBenefitMeasurements } from '../src/mocks/benefitMeasurements';
import { mockMeasurementDashboards } from '../src/mocks/measurementDashboards';
import { mockMetricDefinitions } from '../src/mocks/metricDefinitions';
import { mockKBFeedback } from '../src/mocks/kbFeedback';
import { kbAnalytics } from '../src/mocks/kbAnalytics';

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
    { kind: 'notification', items: mockNotifications },
    { kind: 'notification-pref', items: mockNotificationPreferences },
    { kind: 'quiet-hours', items: [mockQuietHours] },
    { kind: 'inbox-legacy', items: legacyMockInboxItems },
    { kind: 'inbox-item', items: mockInboxItems },
    { kind: 'on-call-schedule', items: mockOnCallSchedules },
    { kind: 'on-call-override', items: mockOnCallOverrides },
    { kind: 'status-page-entry', items: mockStatusPageEntries },
    { kind: 'status-page-incident', items: mockStatusPageIncidents },
    { kind: 'rbac-user', items: mockRbacUsers },
    { kind: 'rbac-team', items: mockRbacTeams },
    { kind: 'rbac-application', items: mockApplications },
    { kind: 'rbac-department', items: mockDepartments },
    { kind: 'rbac-division', items: mockDivisions },
    { kind: 'rbac-role', items: mockFunctionalRoles },
    { kind: 'report', items: mockReports },
    { kind: 'roi-calc', items: mockROICalculations },
    { kind: 'benefit-measurement', items: mockBenefitMeasurements },
    { kind: 'measurement-dashboard', items: mockMeasurementDashboards },
    { kind: 'metric-def', items: mockMetricDefinitions },
    { kind: 'kb-feedback', items: mockKBFeedback },
    { kind: 'kb-analytics', items: [kbAnalytics] },
  ];

  for (const b of batches) {
    if (!b.items.length) continue;
    await prisma.document.createMany({ data: buildBatch(tenantId, b.kind, b.items) });
  }
};
