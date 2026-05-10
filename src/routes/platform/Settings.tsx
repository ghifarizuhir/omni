import React from 'react';
import { Link } from 'react-router-dom';
import { AppearanceSettings } from '../../components/platform/AppearanceSettings';
import { IntegrationCard } from '../../components/platform/IntegrationCard';

const NAV_SECTIONS = [
  {
    heading: 'Account',
    items: [
      { label: 'Profile', href: '/profile' },
      { label: 'Notifications', href: '/notifications/preferences' },
      { label: 'API tokens', href: '/profile#tokens' },
    ],
  },
  {
    heading: 'Appearance',
    items: [
      { label: 'Theme', href: '#appearance' },
      { label: 'Density', href: '#appearance' },
    ],
  },
  {
    heading: 'Integrations',
    items: [
      { label: 'Slack', href: '#integrations' },
      { label: 'PagerDuty', href: '#integrations' },
      { label: 'GitHub', href: '#integrations' },
      { label: 'Prometheus', href: '#integrations' },
    ],
  },
];

const noop = () => {};

const INTEGRATIONS = [
  {
    name: 'Slack',
    logo: '💬',
    connected: true,
    details: [
      'Workspace: Acme Corp (acme.slack.com)',
      'Channels: #incidents, #payment-engineering, #platform-oncall',
    ],
    actions: [
      { label: 'Test connection', handler: noop, variant: 'outline' as const },
      { label: 'Disconnect', handler: noop, variant: 'ghost' as const },
    ],
  },
  {
    name: 'PagerDuty',
    logo: '🔔',
    connected: false,
    description: 'Connect PagerDuty to sync on-call schedules and escalation policies with OIS.',
    details: [],
    actions: [
      { label: 'Connect PagerDuty', handler: noop, variant: 'primary' as const },
    ],
  },
  {
    name: 'GitHub',
    logo: '🐙',
    connected: true,
    details: [
      'Organization: acme-corp',
      'Repositories: 12 · Pipelines: 5',
    ],
    actions: [
      { label: 'Manage repos', handler: noop, variant: 'outline' as const },
      { label: 'Disconnect', handler: noop, variant: 'ghost' as const },
    ],
  },
  {
    name: 'Prometheus',
    logo: '📊',
    connected: true,
    details: [
      'Endpoint: https://prometheus.acme.io',
      'Last scraped: 2m ago · Rules: 12',
    ],
    actions: [
      { label: 'Test connection', handler: noop, variant: 'outline' as const },
      { label: 'Edit config', handler: noop, variant: 'ghost' as const },
    ],
  },
];

export const Settings: React.FC = () => {
  return (
    <div className="flex min-h-0 flex-1">
      {/* Left nav */}
      <aside className="w-44 shrink-0 border-r border-ois-border bg-ois-surface py-8 px-3 space-y-6">
        {NAV_SECTIONS.map(section => (
          <div key={section.heading}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-ois-text-muted px-2 mb-1.5">
              {section.heading}
            </p>
            <ul className="space-y-0.5">
              {section.items.map(item => (
                <li key={item.label}>
                  <Link
                    to={item.href}
                    className="block w-full text-left px-2 py-1.5 text-sm text-ois-text-muted rounded-md hover:bg-ois-surface-muted hover:text-ois-text transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </aside>

      {/* Right content */}
      <main className="flex-1 overflow-y-auto py-8 px-8 space-y-12">
        {/* Appearance */}
        <section id="appearance">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-ois-text tracking-tight">Appearance</h2>
            <p className="text-sm text-ois-text-muted mt-0.5">
              Customize the look and feel of OIS to match your workflow.
            </p>
          </div>
          <AppearanceSettings />
        </section>

        {/* Integrations */}
        <section id="integrations">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-ois-text tracking-tight">Integrations</h2>
            <p className="text-sm text-ois-text-muted mt-0.5">
              Connect OIS with your existing toolchain for seamless operations.
            </p>
          </div>
          <div className="space-y-3">
            {INTEGRATIONS.map(integration => (
              <IntegrationCard key={integration.name} {...integration} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Settings;
