import { useLocation } from 'react-router-dom';

export type Crumb = { label: string; href?: string };

const LABELS: Record<string, string> = {
  cmdb: 'CMDB',
  graph: 'Topology Graph',
  audit: 'Audit Log',
  events: 'Event Stream',
  monitoring: 'Monitoring',
  rules: 'Rules',
  routing: 'Alert Routing',
  coverage: 'Coverage Report',
  incidents: 'Incidents',
  analytics: 'Analytics',
  major: 'Major Incident',
  problems: 'Problems',
  rca: 'RCA Workspace',
  kedb: 'KEDB',
  requests: 'Requests',
  portal: 'Service Portal',
  catalog: 'Catalog',
  'my-requests': 'My Requests',
  kb: 'Knowledge Base',
  editor: 'Editor',
  changes: 'Changes',
  new: 'New Change',
  calendar: 'Calendar',
  cab: 'CAB Workspace',
  releases: 'Releases',
  pipeline: 'Pipeline',
  notes: 'Release Notes',
  deployments: 'Deployments',
  environments: 'Environments',
  testing: 'Testing',
  plans: 'Test Plans',
  cases: 'Test Cases',
  runs: 'Test Runs',
  'sign-off': 'Sign-Off Queue',
  availability: 'Availability',
  sla: 'SLA Targets',
  outages: 'Outages',
  capacity: 'Capacity',
  forecast: 'Forecast',
  thresholds: 'Thresholds',
  continuity: 'Continuity',
  bia: 'BIA Matrix',
  'dr-plans': 'DR Plans',
  tests: 'DR Tests',
  dashboards: 'Measurement',
  exec: 'Executive Dashboard',
  reports: 'Reports',
  builder: 'Report Builder',
  metrics: 'Metrics',
  improvement: 'Improvement',
  kanban: 'Kanban Board',
  heatmap: 'Heatmap',
  benefits: 'Benefit Tracker',
  inbox: 'Inbox',
  notifications: 'Notifications',
  preferences: 'Preferences',
  'on-call': 'On-Call',
  schedule: 'Schedule',
  overrides: 'Overrides',
  status: 'Status Page',
  profile: 'Profile',
  settings: 'Settings',
  ai: 'AI Workspace',
};

// When a first-level segment belongs to a logical section, insert that section as a parent crumb
const IMPLICIT_PARENTS: Record<string, { label: string; href: string }> = {
  events: { label: 'Monitoring', href: '/monitoring/rules' },
  kedb: { label: 'Problems', href: '/problems' },
  'on-call': { label: 'Platform', href: '/on-call' },
};

// Contextual labels for dynamic ID segments based on their parent segment
const ID_LABELS: Record<string, string> = {
  cmdb: 'CI Detail',
  events: 'Event Detail',
  incidents: 'Incident Detail',
  major: 'War Room',
  problems: 'Problem Detail',
  requests: 'Request Detail',
  catalog: 'Item Detail',
  changes: 'Change Detail',
  releases: 'Release Detail',
  deployments: 'Deployment Detail',
  improvement: 'Initiative Detail',
  kb: 'Article',
  ai: 'Session',
};

function looksLikeId(segment: string): boolean {
  // UUIDs, numeric IDs, slug-like IDs with mixed case/numbers
  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(segment) || // UUID
    /^\d+$/.test(segment) ||                        // pure numeric
    /^[A-Z]+-\d+$/.test(segment) ||                // INC-123 style
    (segment.length > 8 && !/^[a-z-]+$/.test(segment)) // long non-slug
  );
}

export function useBreadcrumbs(): Crumb[] {
  const { pathname } = useLocation();

  if (pathname === '/') return [];

  const segments = pathname.split('/').filter(Boolean);
  const crumbs: Crumb[] = [];

  // Inject implicit parent if needed
  const implicitParent = IMPLICIT_PARENTS[segments[0]];
  if (implicitParent) {
    crumbs.push({ label: implicitParent.label, href: implicitParent.href });
  }

  let href = '';
  segments.forEach((seg, i) => {
    href += `/${seg}`;
    const isLast = i === segments.length - 1;
    const prevSeg = segments[i - 1];

    let label: string;
    if (looksLikeId(seg)) {
      label = (prevSeg && ID_LABELS[prevSeg]) ?? seg;
    } else {
      label = LABELS[seg] ?? seg;
    }

    crumbs.push({ label, href: isLast ? undefined : href });
  });

  return crumbs;
}
