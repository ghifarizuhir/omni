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
import type { ROICalculation } from '../src/types/improvement';
import type { BenefitMeasurement } from '../src/types/improvement';

const mockROICalculations: ROICalculation[] = [
  { initiativeId: 'imp-011', calculatedAt: '2026-04-25T00:00:00Z', implementationCostUSD: 9600, ongoingMonthlyCostUSD: 200, totalCost12mUSD: 12000, projectedAnnualBenefitUSD: 320000, actualBenefitToDateUSD: 0, roi12mPercent: 2567, paybackMonths: 0.45, npv5yUSD: 1480000, pessimisticROI: 1283, optimisticROI: 3208 },
  { initiativeId: 'imp-012', calculatedAt: '2026-05-05T00:00:00Z', implementationCostUSD: 4000, ongoingMonthlyCostUSD: 0, totalCost12mUSD: 4000, projectedAnnualBenefitUSD: 180000, actualBenefitToDateUSD: 0, roi12mPercent: 4400, paybackMonths: 0.27, npv5yUSD: 820000, pessimisticROI: 2200, optimisticROI: 5500 },
  { initiativeId: 'imp-006', calculatedAt: '2026-03-10T00:00:00Z', implementationCostUSD: 16000, ongoingMonthlyCostUSD: 0, totalCost12mUSD: 16000, projectedAnnualBenefitUSD: 480000, actualBenefitToDateUSD: 0, roi12mPercent: 2900, paybackMonths: 0.4, npv5yUSD: 2200000, pessimisticROI: 1450, optimisticROI: 3625 },
];

const mockBenefitMeasurements: BenefitMeasurement[] = [
  { id: 'bm-001', initiativeId: 'imp-009', initiativePublicId: 'IMP-2026-00009', measurementDate: '2026-05-10', periodLabel: 'Month 1 (post-completion)', benefitType: 'risk_reduction', measuredValueUSD: 2000, cumulativeValueUSD: 2000, isEstimate: false, supportingMetric: 'INC-2026-00184 detected 8 min earlier due to reduced cooldown', methodology: 'Estimated 8 min reduction × avg P1 cost of $800/min', recordedById: 'u-005', recordedByName: 'Yuki Tanaka' },
  { id: 'bm-002', initiativeId: 'imp-005', initiativePublicId: 'IMP-2026-00005', measurementDate: '2026-04-01', periodLabel: 'Q1 Audit (actual)', benefitType: 'efficiency_gain', measuredValueUSD: 60000, cumulativeValueUSD: 60000, isEstimate: false, supportingMetric: '3 days saved × 4 engineers at $5k/day rate', methodology: 'Engineer time tracking during Q1 2026 PCI audit vs 2025 baseline', recordedById: 'u-001', recordedByName: 'Sarah Chen' },
];
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
