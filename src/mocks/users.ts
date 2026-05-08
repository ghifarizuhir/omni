import { User } from "../types";

export const mockUsers: User[] = [
  { id: 'u-001', name: 'Sarah Chen',         email: 'sarah.chen@acme.io',     role: 'admin',          team: 't-platform', timezone: 'America/Los_Angeles' },
  { id: 'u-002', name: 'Marcus Hill',        email: 'marcus.hill@acme.io',    role: 'agent-l1',       team: 't-servicedesk', timezone: 'America/New_York' },
  { id: 'u-003', name: 'Priya Raman',        email: 'priya.raman@acme.io',    role: 'agent-l2',       team: 't-servicedesk', timezone: 'Asia/Singapore' },
  { id: 'u-004', name: 'David Okafor',       email: 'david.okafor@acme.io',   role: 'agent-l3',       team: 't-sre',         timezone: 'Europe/London' },
  { id: 'u-005', name: 'Yuki Tanaka',        email: 'yuki.tanaka@acme.io',    role: 'agent-l3',       team: 't-sre',         timezone: 'Asia/Tokyo' },
  { id: 'u-006', name: 'Helena Vasquez',     email: 'helena.vasquez@acme.io', role: 'change-manager', team: 't-platform',    timezone: 'America/Chicago' },
  { id: 'u-007', name: 'Tom Bergstrom',      email: 'tom.bergstrom@acme.io',  role: 'service-owner',  team: 't-platform',    timezone: 'Europe/Stockholm' },
  { id: 'u-008', name: 'Aisha Khan',         email: 'aisha.khan@acme.io',     role: 'service-owner',  team: 't-data',        timezone: 'Asia/Dubai' },
  { id: 'u-009', name: 'Roberto Silva',      email: 'roberto.silva@acme.io',  role: 'agent-l2',       team: 't-network',     timezone: 'America/Sao_Paulo' },
  { id: 'u-010', name: 'Emma Müller',        email: 'emma.muller@acme.io',    role: 'admin',          team: 't-platform',    timezone: 'Europe/Berlin' },
  { id: 'u-011', name: 'Liam O’Connor',      email: 'liam.oconnor@acme.io',   role: 'requester',      team: 't-product',     timezone: 'Europe/Dublin' },
  { id: 'u-012', name: 'Naomi Becker',       email: 'naomi.becker@acme.io',   role: 'viewer',         team: 't-product',     timezone: 'America/Los_Angeles' },
];

export const currentUser: User = mockUsers[0]; // Sarah Chen (admin)
