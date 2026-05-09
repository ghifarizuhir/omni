import { DailyServiceHealth } from '../types';

type HealthStatus = DailyServiceHealth['status'];

function uptimeToStatus(uptimePercent: number, isMaintenanceDay: boolean): HealthStatus {
  if (isMaintenanceDay) return 'maintenance';
  if (uptimePercent >= 99.9) return 'operational';
  if (uptimePercent >= 99.0) return 'degraded';
  if (uptimePercent >= 95.0) return 'partial_outage';
  return 'major_outage';
}

function generateDailyServiceHealth(): DailyServiceHealth[] {
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

  // Maintenance days: 'serviceId:date'
  const maintenanceDays = new Set([
    'svc-007:2026-05-06',  // Internal Wiki planned maintenance
    'svc-008:2026-03-15',  // CI/CD Platform planned maintenance
    'svc-002:2026-04-05',  // Auth Service planned maintenance
    'svc-008:2026-05-05',  // CI/CD Platform planned maintenance
    'svc-002:2026-04-27',  // Auth planned maintenance
    'svc-008:2026-04-20',  // CI/CD planned maintenance
  ]);

  // Uptime exceptions: 'serviceId:date' → uptimePercent
  const uptimeExceptions: Record<string, number> = {
    // Payment
    'svc-001:2026-03-25': 99.31,
    'svc-001:2026-04-22': 99.51,
    'svc-001:2026-05-03': 97.92,
    'svc-001:2026-05-08': 95.0,
    // Order
    'svc-003:2026-05-08': 98.6,
    'svc-003:2026-05-04': 98.47,
    'svc-003:2026-04-25': 98.61,
    'svc-003:2026-04-05': 97.57,
    // Notification
    'svc-004:2026-05-05': 97.08,
    'svc-004:2026-05-02': 98.75,
    'svc-004:2026-04-14': 98.61,
    // Search
    'svc-005:2026-05-03': 98.89,
    'svc-005:2026-05-08': 97.5,
    'svc-005:2026-04-18': 98.40,
    // Analytics
    'svc-006:2026-04-17': 93.96,
    'svc-006:2026-05-04': 97.78,
    // Wiki
    'svc-007:2026-05-06': 91.67,
    // Auth
    'svc-002:2026-05-06': 98.75,
    'svc-002:2026-05-04': 99.17,
    'svc-002:2026-04-23': 98.75,
  };

  // Incident count exceptions
  const incidentExceptions: Record<string, number> = {
    'svc-001:2026-03-25': 1,
    'svc-001:2026-04-22': 1,
    'svc-001:2026-05-03': 1,
    'svc-001:2026-05-08': 1,
    'svc-003:2026-05-08': 1,
    'svc-003:2026-05-04': 1,
    'svc-003:2026-04-25': 1,
    'svc-003:2026-04-05': 1,
    'svc-004:2026-05-05': 1,
    'svc-004:2026-05-02': 1,
    'svc-004:2026-04-14': 1,
    'svc-005:2026-05-03': 1,
    'svc-005:2026-05-08': 1,
    'svc-005:2026-04-18': 1,
    'svc-006:2026-04-17': 1,
    'svc-006:2026-05-04': 1,
    'svc-002:2026-05-06': 1,
    'svc-002:2026-05-04': 1,
    'svc-002:2026-04-23': 1,
  };

  // Outage minutes exceptions
  const outageExceptions: Record<string, number> = {
    'svc-001:2026-03-25': 10,
    'svc-001:2026-04-22': 7,
    'svc-001:2026-05-03': 30,
    'svc-001:2026-05-08': 72,
    'svc-003:2026-05-08': 20,
    'svc-003:2026-05-04': 22,
    'svc-003:2026-04-25': 20,
    'svc-003:2026-04-05': 35,
    'svc-004:2026-05-05': 42,
    'svc-004:2026-05-02': 18,
    'svc-004:2026-04-14': 20,
    'svc-005:2026-05-03': 16,
    'svc-005:2026-05-08': 36,
    'svc-005:2026-04-18': 23,
    'svc-006:2026-04-17': 87,
    'svc-006:2026-05-04': 32,
    'svc-007:2026-05-06': 120,
    'svc-002:2026-05-06': 18,
    'svc-002:2026-05-04': 12,
    'svc-002:2026-04-23': 18,
  };

  const data: DailyServiceHealth[] = [];
  const startDate = new Date('2026-02-08');

  for (const serviceId of services) {
    for (let d = 0; d < 90; d++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + d);
      const dateStr = date.toISOString().split('T')[0];
      const key = `${serviceId}:${dateStr}`;
      const isMaintenance = maintenanceDays.has(key);
      const uptimePercent = uptimeExceptions[key] ?? 100;
      const status = uptimeToStatus(uptimePercent, isMaintenance);
      data.push({
        date: dateStr,
        serviceId,
        status,
        uptimePercent,
        incidentCount: incidentExceptions[key] ?? 0,
        outageMinutes: outageExceptions[key] ?? 0,
      });
    }
  }

  return data;
}

export const mockDailyServiceHealth = generateDailyServiceHealth();

export const getDailyHealthForService = (serviceId: string, days: number): DailyServiceHealth[] =>
  mockDailyServiceHealth.filter(d => d.serviceId === serviceId).slice(-days);
