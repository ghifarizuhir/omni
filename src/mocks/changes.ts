import { Severity } from "../types";

export interface MockChangeSummary {
  id: string;
  title: string;
  type: 'standard' | 'normal' | 'emergency';
  status: 'draft' | 'scheduled' | 'implementing' | 'completed';
  serviceId: string;
  startTime: string; // ISO
  endTime: string; // ISO
  risk: 'low' | 'medium' | 'high';
  conflict?: boolean;
}

export const mockChanges: MockChangeSummary[] = [
  { 
    id: 'CHG-2026-00088', 
    title: 'Standard change request: certificate renewal', 
    type: 'standard', 
    status: 'scheduled', 
    serviceId: 'svc-002', 
    startTime: '2026-05-08T14:00:00Z', 
    endTime: '2026-05-08T14:30:00Z',
    risk: 'low'
  },
  { 
    id: 'CHG-2026-00091', 
    title: 'Payment Service v2.4 rollout', 
    type: 'normal', 
    status: 'scheduled', 
    serviceId: 'svc-001', 
    startTime: '2026-05-10T10:00:00Z', 
    endTime: '2026-05-10T12:00:00Z',
    risk: 'medium',
    conflict: true
  },
  { 
    id: 'CHG-2026-00086', 
    title: 'Internal Wiki maintenance window', 
    type: 'normal', 
    status: 'scheduled', 
    serviceId: 'svc-007', 
    startTime: '2026-05-09T02:00:00Z', 
    endTime: '2026-05-09T04:00:00Z',
    risk: 'low'
  },
  { 
    id: 'CHG-2026-00089', 
    title: 'Analytics DB migration', 
    type: 'emergency', 
    status: 'implementing', 
    serviceId: 'svc-006', 
    startTime: '2026-05-08T08:00:00Z', 
    endTime: '2026-05-08T10:00:00Z',
    risk: 'high'
  }
];
