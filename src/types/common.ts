export type EntityIdPrefix =
  | 'INC'  // Incident
  | 'PRB'  // Problem
  | 'CHG'  // Change
  | 'REL'  // Release
  | 'DEP'  // Deployment
  | 'REQ'  // Service Request
  | 'CI'   // Configuration Item
  | 'EVT'  // Event
  | 'KB'   // Knowledge article
  | 'IMP'  // Improvement Initiative
  | 'ONC'  // On-Call schedule
  | 'STP'; // Status Page incident

export type UserRole =
  | 'admin'
  | 'service-owner'
  | 'change-manager'
  | 'agent-l1'
  | 'agent-l2'
  | 'agent-l3'
  | 'requester'
  | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: UserRole;
  team?: string; // team id
  timezone: string; // IANA, e.g. 'Asia/Jakarta'
  mustChangePassword?: boolean;
}

export interface Team {
  id: string;
  name: string;
  members: string[]; // user ids
}

export type Severity = 'P1' | 'P2' | 'P3' | 'P4';

export type GenericStatus =
  | 'open'
  | 'in_progress'
  | 'pending'
  | 'resolved'
  | 'closed'
  | 'cancelled';

export type ServiceHealthStatus =
  | 'operational'
  | 'degraded'
  | 'partial_outage'
  | 'major_outage'
  | 'maintenance';

export interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
}
