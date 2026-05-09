import { AvailabilityDataPoint } from '../types';

function generateAvailabilityData(): AvailabilityDataPoint[] {
  const services = [
    'svc-001',
    'svc-002',
    'svc-003',
    'svc-004',
    'svc-005',
    'svc-006',
    'svc-007',
    'svc-008',
  ];

  const exceptions: Record<string, Partial<AvailabilityDataPoint>> = {
    // Payment Service (svc-001)
    'svc-001:2026-03-25': { uptimePercent: 99.31, downtimeMinutes: 0, partialDowntimeMinutes: 10, incidentCount: 1 },
    'svc-001:2026-04-22': { uptimePercent: 99.51, downtimeMinutes: 0, partialDowntimeMinutes: 7, incidentCount: 1 },
    'svc-001:2026-05-03': { uptimePercent: 97.92, downtimeMinutes: 30, partialDowntimeMinutes: 0, incidentCount: 1 },
    'svc-001:2026-05-08': { uptimePercent: 95.0, downtimeMinutes: 0, partialDowntimeMinutes: 72, incidentCount: 1 },

    // Order Service (svc-003)
    'svc-003:2026-05-08': { uptimePercent: 98.6, downtimeMinutes: 0, partialDowntimeMinutes: 20, incidentCount: 1 },
    'svc-003:2026-05-04': { uptimePercent: 98.47, downtimeMinutes: 22, partialDowntimeMinutes: 0, incidentCount: 1 },
    'svc-003:2026-04-25': { uptimePercent: 98.61, downtimeMinutes: 20, partialDowntimeMinutes: 0, incidentCount: 1 },
    'svc-003:2026-04-05': { uptimePercent: 97.57, downtimeMinutes: 35, partialDowntimeMinutes: 0, incidentCount: 1 },

    // Notification Gateway (svc-004)
    'svc-004:2026-05-05': { uptimePercent: 97.08, downtimeMinutes: 42, partialDowntimeMinutes: 0, incidentCount: 1 },
    'svc-004:2026-05-02': { uptimePercent: 98.75, downtimeMinutes: 18, partialDowntimeMinutes: 0, incidentCount: 1 },
    'svc-004:2026-04-14': { uptimePercent: 98.61, downtimeMinutes: 20, partialDowntimeMinutes: 0, incidentCount: 1 },

    // Search Service (svc-005)
    'svc-005:2026-05-03': { uptimePercent: 98.89, downtimeMinutes: 16, partialDowntimeMinutes: 0, incidentCount: 1 },
    'svc-005:2026-05-08': { uptimePercent: 97.5, downtimeMinutes: 0, partialDowntimeMinutes: 36, incidentCount: 1 },
    'svc-005:2026-04-18': { uptimePercent: 98.40, downtimeMinutes: 23, partialDowntimeMinutes: 0, incidentCount: 1 },

    // Analytics Pipeline (svc-006)
    'svc-006:2026-04-17': { uptimePercent: 93.96, downtimeMinutes: 87, partialDowntimeMinutes: 0, incidentCount: 1 },
    'svc-006:2026-05-04': { uptimePercent: 97.78, downtimeMinutes: 32, partialDowntimeMinutes: 0, incidentCount: 1 },

    // Internal Wiki (svc-007)
    'svc-007:2026-05-06': { uptimePercent: 91.67, downtimeMinutes: 120, partialDowntimeMinutes: 0, incidentCount: 0 },

    // Auth Service (svc-002)
    'svc-002:2026-05-06': { uptimePercent: 98.75, downtimeMinutes: 18, partialDowntimeMinutes: 0, incidentCount: 1 },
    'svc-002:2026-05-04': { uptimePercent: 99.17, downtimeMinutes: 12, partialDowntimeMinutes: 0, incidentCount: 1 },
    'svc-002:2026-04-23': { uptimePercent: 98.75, downtimeMinutes: 18, partialDowntimeMinutes: 0, incidentCount: 1 },
  };

  const data: AvailabilityDataPoint[] = [];
  const startDate = new Date('2026-02-08');

  for (const serviceId of services) {
    for (let d = 0; d < 90; d++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + d);
      const dateStr = date.toISOString().split('T')[0];
      const key = `${serviceId}:${dateStr}`;
      const exception = exceptions[key];
      data.push({
        date: dateStr,
        serviceId,
        totalMinutesInDay: 1440,
        uptimePercent: 100,
        downtimeMinutes: 0,
        partialDowntimeMinutes: 0,
        incidentCount: 0,
        ...exception,
      });
    }
  }

  return data;
}

export const mockAvailabilityData = generateAvailabilityData();

export const getAvailabilityForService = (serviceId: string) =>
  mockAvailabilityData.filter(d => d.serviceId === serviceId);

export const getDailyAvailabilityForService = (serviceId: string, days: number) =>
  mockAvailabilityData.filter(d => d.serviceId === serviceId).slice(-days);
