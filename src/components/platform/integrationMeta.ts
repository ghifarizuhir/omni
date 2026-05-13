import type { IntegrationKind } from '../../types/integration';

export const INTEGRATION_META: Record<
  IntegrationKind,
  { label: string; logo: string; defaultMode: 'webhook' | 'api'; blurb: string }
> = {
  dynatrace:  { label: 'Dynatrace',  logo: '🟣', defaultMode: 'api',     blurb: 'Pull metrics, problems, and topology via the Dynatrace API.' },
  kibana:     { label: 'Kibana',     logo: '🔵', defaultMode: 'webhook', blurb: 'Receive watcher and Elastic Alerting webhooks.' },
  grafana:    { label: 'Grafana',    logo: '🟠', defaultMode: 'webhook', blurb: 'Receive Grafana Alerting contact-point webhooks.' },
  datadog:    { label: 'Datadog',    logo: '🟪', defaultMode: 'webhook', blurb: 'Receive Datadog monitor webhooks.' },
  prometheus: { label: 'Prometheus', logo: '🟧', defaultMode: 'webhook', blurb: 'Receive Alertmanager webhook deliveries.' },
  newrelic:   { label: 'New Relic',  logo: '🟩', defaultMode: 'webhook', blurb: 'Receive New Relic alert policy webhooks.' },
  cloudwatch: { label: 'CloudWatch', logo: '☁️', defaultMode: 'webhook', blurb: 'Receive AWS CloudWatch alarm notifications via webhook.' },
  custom:     { label: 'Custom source', logo: '🔗', defaultMode: 'webhook', blurb: 'Generic webhook for any system that can POST JSON.' },
};
