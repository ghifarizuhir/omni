import { Team } from "../types";

export const mockTeams: Team[] = [
  { id: 't-platform',    name: 'Platform Engineering', members: ['u-001', 'u-006', 'u-007', 'u-010'] },
  { id: 't-sre',         name: 'SRE',                  members: ['u-004', 'u-005'] },
  { id: 't-servicedesk', name: 'Service Desk',         members: ['u-002', 'u-003'] },
  { id: 't-network',     name: 'Network Operations',   members: ['u-009'] },
  { id: 't-data',        name: 'Data Platform',        members: ['u-008'] },
];
