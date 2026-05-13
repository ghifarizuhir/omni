// External monitoring source integrations.
//
// Two ingestion modes:
//   - "webhook": OIS exposes a unique URL that any external system (Kibana,
//     Grafana, custom scripts, etc.) can POST alerts to.
//   - "api":     OIS pulls data from the upstream system using its API
//     (currently only Dynatrace).

export type IntegrationMode = 'webhook' | 'api';

export type IntegrationKind =
  | 'dynatrace'
  | 'kibana'
  | 'grafana'
  | 'datadog'
  | 'prometheus'
  | 'newrelic'
  | 'cloudwatch'
  | 'custom';

export type IntegrationStatus = 'healthy' | 'degraded' | 'error' | 'pending';

// Which OIS surfaces this integration feeds.
export type IntegrationDomain = 'monitoring' | 'availability' | 'capacity';

export interface Integration {
  id: string;
  name: string;
  kind: IntegrationKind;
  mode: IntegrationMode;

  // Webhook mode
  webhookPath?: string;          // e.g. "/api/v1/hooks/abc123"
  webhookSecret?: string;        // bearer/HMAC secret shown once
  payloadFormat?: 'auto' | 'kibana' | 'grafana' | 'datadog' | 'generic';

  // API mode
  apiBaseUrl?: string;           // e.g. "https://abc12345.live.dynatrace.com"
  apiTokenMasked?: string;       // "dt0c01.****.****"
  pollIntervalSec?: number;

  status: IntegrationStatus;
  domains: IntegrationDomain[];  // which dashboards consume this data
  enabled: boolean;

  // Telemetry
  lastEventAt?: string;
  eventCount24h: number;
  errorMessage?: string;

  createdAt: string;
  createdBy: string;
}
