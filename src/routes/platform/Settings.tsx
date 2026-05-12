import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AppearanceSettings } from '../../components/platform/AppearanceSettings';
import { IntegrationCard } from '../../components/platform/IntegrationCard';
import { cn } from '../../lib/utils';

const NAV_SECTIONS = [
  {
    heading: 'Account',
    items: [
      { label: 'Profile', href: '/profile', external: true },
      { label: 'Notifications', href: '/notifications/preferences', external: true },
      { label: 'API tokens', href: '/profile#tokens', external: true },
    ],
  },
  {
    heading: 'Appearance',
    items: [
      { label: 'Theme', sectionId: 'appearance' },
      { label: 'Density', sectionId: 'appearance' },
    ],
  },
  {
    heading: 'Integrations',
    items: [
      { label: 'Slack', sectionId: 'integrations' },
      { label: 'PagerDuty', sectionId: 'integrations' },
      { label: 'GitHub', sectionId: 'integrations' },
      { label: 'Prometheus', sectionId: 'integrations' },
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
  const [activeSection, setActiveSection] = useState<string>('appearance');
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
            break;
          }
        }
      },
      { root: container, threshold: 0.3 }
    );

    container.querySelectorAll('section[id]').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const scrollTo = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el && contentRef.current) {
      contentRef.current.scrollTo({ top: el.offsetTop - 32, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Page header */}
      <div className="shrink-0 border-b border-ois-border bg-ois-surface px-8 py-5">
        <h1 className="text-xl font-bold text-ois-text tracking-tight">Settings</h1>
        <p className="text-sm text-ois-text-muted mt-0.5">
          Manage your workspace preferences, integrations, and account options.
        </p>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left nav */}
        <aside className="w-48 shrink-0 border-r border-ois-border bg-ois-surface py-6 px-3 space-y-6 overflow-y-auto">
          {NAV_SECTIONS.map(section => (
            <div key={section.heading}>
              <p className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest px-2 mb-1.5">
                {section.heading}
              </p>
              <ul className="space-y-0.5">
                {section.items.map(item => {
                  const isActive = 'sectionId' in item && item.sectionId === activeSection;
                  if ('external' in item && item.external) {
                    return (
                      <li key={item.label}>
                        <Link
                          to={item.href!}
                          className="block w-full text-left px-2 py-1.5 text-sm text-ois-text-muted rounded-md hover:bg-ois-surface-muted hover:text-ois-text transition-colors"
                        >
                          {item.label}
                        </Link>
                      </li>
                    );
                  }
                  return (
                    <li key={item.label}>
                      <button
                        onClick={() => scrollTo(item.sectionId!)}
                        className={cn(
                          'block w-full text-left px-2 py-1.5 text-sm rounded-md transition-colors',
                          isActive
                            ? 'bg-ois-primary-pale text-ois-primary font-medium'
                            : 'text-ois-text-muted hover:bg-ois-surface-muted hover:text-ois-text'
                        )}
                      >
                        {item.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </aside>

        {/* Right content */}
        <main ref={contentRef} className="flex-1 overflow-y-auto py-8 px-8 space-y-12">
          {/* Appearance */}
          <section id="appearance">
            <div className="mb-6">
              <h2 className="text-base font-bold text-ois-text tracking-tight">Appearance</h2>
              <p className="text-sm text-ois-text-muted mt-0.5">
                Customize the look and feel of OIS to match your workflow.
              </p>
            </div>
            <AppearanceSettings />
          </section>

          {/* Integrations */}
          <section id="integrations">
            <div className="mb-6">
              <h2 className="text-base font-bold text-ois-text tracking-tight">Integrations</h2>
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
    </div>
  );
};

export default Settings;
