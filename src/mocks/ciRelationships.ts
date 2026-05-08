import { CIRelationship } from '../types';

export const mockCIRelationships: CIRelationship[] = [
  // Payment Service cluster
  { id: 'rel-001', fromCiId: 'ci-svc-pay-001', toCiId: 'ci-app-pay-001', type: 'contains', createdAt: '2024-02-10T10:00:00Z' },
  { id: 'rel-002', fromCiId: 'ci-svc-pay-001', toCiId: 'ci-app-pay-002', type: 'contains', createdAt: '2024-02-10T10:00:00Z' },
  { id: 'rel-003', fromCiId: 'ci-app-pay-001', toCiId: 'ci-srv-pay-001', type: 'runs_on', createdAt: '2024-02-10T10:00:00Z' },
  { id: 'rel-004', fromCiId: 'ci-app-pay-002', toCiId: 'ci-srv-pay-001', type: 'runs_on', createdAt: '2024-02-10T10:00:00Z' },
  { id: 'rel-005', fromCiId: 'ci-app-pay-001', toCiId: 'ci-db-pay-001', type: 'depends_on', createdAt: '2024-02-10T10:00:00Z' },
  { id: 'rel-006', fromCiId: 'ci-app-pay-002', toCiId: 'ci-db-pay-001', type: 'depends_on', createdAt: '2024-02-10T10:00:00Z' },
  { id: 'rel-007', fromCiId: 'ci-app-pay-001', toCiId: 'ci-ep-stripe-001', type: 'depends_on', createdAt: '2024-02-10T10:00:00Z' },
  { id: 'rel-008', fromCiId: 'ci-app-pay-001', toCiId: 'ci-stg-pay-001', type: 'depends_on', createdAt: '2024-02-10T10:00:00Z' },
  { id: 'rel-009', fromCiId: 'ci-db-pay-001', toCiId: 'ci-db-pay-002', type: 'connects_to', description: 'Replication', createdAt: '2024-02-10T10:00:00Z' },
  { id: 'rel-010', fromCiId: 'ci-srv-pay-001', toCiId: 'ci-lb-ext-001', type: 'connects_to', createdAt: '2024-02-10T10:00:00Z' },
  { id: 'rel-011', fromCiId: 'ci-srv-pay-001', toCiId: 'ci-net-vpc-001', type: 'part_of', createdAt: '2024-02-10T10:00:00Z' },

  // Auth Service cluster
  { id: 'rel-012', fromCiId: 'ci-svc-auth-001', toCiId: 'ci-app-auth-001', type: 'contains', createdAt: '2024-01-20T11:00:00Z' },
  { id: 'rel-013', fromCiId: 'ci-app-auth-001', toCiId: 'ci-srv-auth-001', type: 'runs_on', createdAt: '2024-01-20T11:00:00Z' },
  { id: 'rel-014', fromCiId: 'ci-app-auth-001', toCiId: 'ci-db-auth-001', type: 'depends_on', createdAt: '2024-01-20T11:00:00Z' },
  { id: 'rel-015', fromCiId: 'ci-app-auth-001', toCiId: 'ci-ep-twilio-001', type: 'depends_on', createdAt: '2024-01-20T11:00:00Z' },
  { id: 'rel-016', fromCiId: 'ci-srv-auth-001', toCiId: 'ci-lb-ext-001', type: 'connects_to', createdAt: '2024-01-20T11:00:00Z' },
  { id: 'rel-017', fromCiId: 'ci-srv-auth-001', toCiId: 'ci-net-vpc-001', type: 'part_of', createdAt: '2024-01-20T11:00:00Z' },

  // Order Service cluster
  { id: 'rel-018', fromCiId: 'ci-svc-ord-001', toCiId: 'ci-app-ord-001', type: 'contains', createdAt: '2024-03-15T09:00:00Z' },
  { id: 'rel-019', fromCiId: 'ci-svc-ord-001', toCiId: 'ci-app-ord-002', type: 'contains', createdAt: '2024-03-15T09:00:00Z' },
  { id: 'rel-020', fromCiId: 'ci-app-ord-001', toCiId: 'ci-srv-ord-001', type: 'runs_on', createdAt: '2024-03-15T09:00:00Z' },
  { id: 'rel-021', fromCiId: 'ci-app-ord-002', toCiId: 'ci-srv-ord-002', type: 'runs_on', createdAt: '2026-05-05T14:00:00Z' },
  { id: 'rel-022', fromCiId: 'ci-app-ord-001', toCiId: 'ci-db-ord-001', type: 'depends_on', createdAt: '2024-03-15T09:00:00Z' },
  { id: 'rel-023', fromCiId: 'ci-app-ord-002', toCiId: 'ci-db-ord-001', type: 'depends_on', createdAt: '2024-03-15T09:00:00Z' },
  { id: 'rel-024', fromCiId: 'ci-app-ord-001', toCiId: 'ci-svc-pay-001', type: 'depends_on', description: 'Cross-service call', createdAt: '2024-03-15T09:00:00Z' },
  { id: 'rel-025', fromCiId: 'ci-app-ord-001', toCiId: 'ci-svc-auth-001', type: 'depends_on', description: 'Auth verification', createdAt: '2026-05-07T12:00:00Z' },
  { id: 'rel-026', fromCiId: 'ci-srv-ord-001', toCiId: 'ci-lb-ext-001', type: 'connects_to', createdAt: '2024-03-15T09:00:00Z' },
  { id: 'rel-027', fromCiId: 'ci-srv-ord-002', toCiId: 'ci-lb-int-001', type: 'connects_to', createdAt: '2026-05-05T14:00:00Z' },
  { id: 'rel-028', fromCiId: 'ci-srv-ord-001', toCiId: 'ci-net-vpc-001', type: 'part_of', createdAt: '2024-03-15T09:00:00Z' },
  { id: 'rel-029', fromCiId: 'ci-srv-ord-002', toCiId: 'ci-net-vpc-001', type: 'part_of', createdAt: '2026-05-05T14:00:00Z' },

  // Infrastructure
  { id: 'rel-030', fromCiId: 'ci-lb-ext-001', toCiId: 'ci-net-vpc-001', type: 'part_of', createdAt: '2024-01-10T09:00:00Z' },
  { id: 'rel-031', fromCiId: 'ci-lb-int-001', toCiId: 'ci-net-vpc-001', type: 'part_of', createdAt: '2024-01-10T09:30:00Z' },
  { id: 'rel-032', fromCiId: 'ci-lb-ext-001', toCiId: 'ci-lb-int-001', type: 'connects_to', createdAt: '2024-01-10T09:30:00Z' },
  { id: 'rel-033', fromCiId: 'ci-db-pay-001', toCiId: 'ci-srv-pay-001', type: 'runs_on', createdAt: '2024-01-20T12:00:00Z' },
  { id: 'rel-034', fromCiId: 'ci-db-auth-001', toCiId: 'ci-srv-auth-001', type: 'runs_on', createdAt: '2024-01-15T09:00:00Z' },
  { id: 'rel-035', fromCiId: 'ci-db-ord-001', toCiId: 'ci-srv-ord-001', type: 'runs_on', createdAt: '2024-03-20T10:00:00Z' },
];

export const getRelationshipsForCI = (ciId: string) => {
  return {
    outgoing: mockCIRelationships.filter(r => r.fromCiId === ciId),
    incoming: mockCIRelationships.filter(r => r.toCiId === ciId)
  };
};
