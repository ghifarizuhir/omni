import { Severity } from './common';
export type { Severity };

// Event level (per ITIL 4 §7.14)
export type EventType = 'informational' | 'warning' | 'exception';

// Event status (lifecycle)
export type EventStatus = 'open' | 'acknowledged' | 'resolved' | 'suppressed';

// Source of an event (where ingested from)
export type EventSource =
  | 'prometheus'
  | 'opentelemetry'
  | 'log_pattern'        // Pattern match in OpenSearch logs
  | 'synthetic'          // Synthetic check (uptime probe, smoke test)
  | 'webhook'            // Generic external webhook
  | 'cicd'               // CI/CD pipeline (e.g. deploy failure)
  | 'cloud_provider'     // AWS CloudWatch, GCP Monitoring, etc.
  | 'manual';            // Manually created

// Monitoring rule type
export type MonitoringRuleType =
  | 'threshold'          // Metric > X for Y duration
  | 'anomaly'            // Statistical deviation
  | 'composite'          // AND/OR of multiple sub-rules
  | 'log_pattern'        // OpenSearch query match
  | 'synthetic'          // Synthetic probe
  | 'absence';           // Heartbeat: no event in N minutes = alert

// Channels for alert routing
export type AlertChannel = 'email' | 'slack' | 'teams' | 'sms' | 'webhook' | 'in_app';

// Recipient targets
export type RecipientType = 'user' | 'team' | 'oncall_schedule';

// === EVENT ===
export interface Event {
  id: string;
  publicId: string;              // e.g. "EVT-2026-00099"
  type: EventType;
  status: EventStatus;
  severity: Severity;
  title: string;
  message: string;
  source: EventSource;
  ruleId?: string;
  rulePublicId?: string;
  ruleName?: string;
  affectedCIIds: string[];
  affectedCIPublicIds: string[];
  correlationKey: string;
  groupCount: number;
  firedAt: string;
  lastSeenAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  linkedIncidentId?: string;
  payload: Record<string, unknown>;
  tags: string[];
}

// === MONITORING RULE ===
export interface MonitoringRule {
  id: string;
  publicId: string;
  name: string;
  description?: string;
  type: MonitoringRuleType;
  enabled: boolean;
  source: EventSource;
  query: string;
  targetMode: 'explicit' | 'selector';
  targetCIIds: string[];
  targetSelector?: {
    types?: string[];
    tags?: string[];
    services?: string[];
    environments?: string[];
  };
  targetCount: number;
  condition: {
    operator?: '>' | '<' | '>=' | '<=' | '==' | '!=';
    threshold?: number;
    duration?: string;
    evaluationWindow?: string;
  };
  severity: Severity;
  cooldown: string;
  alertRouteId: string;
  alertRoutePublicId: string;
  lastTriggeredAt?: string;
  totalFires30d: number;
  signalToNoiseRatio?: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

// === ALERT ROUTE ===
export interface AlertRoute {
  id: string;
  publicId: string;
  name: string;
  description?: string;
  matchExpression: {
    severities?: Severity[];
    sources?: EventSource[];
    tags?: string[];
  };
  channels: AlertChannel[];
  recipients: AlertRecipient[];
  escalationSteps: EscalationStep[];
  severityRange?: string[]; // Added for UI helper if needed
  quietHours?: {
    enabled: boolean;
    timezone: string;
    fromHour: number;
    toHour: number;
    daysOfWeek: number[];
  };
  enabled: boolean;
  ruleCount: number;
  lastTriggeredAt?: string;
  lastTriggeredRuleId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AlertRecipient {
  id: string;
  type: RecipientType;
  targetId: string;
  targetName: string;
}

export interface EscalationStep {
  id: string;
  delayMinutes: number;
  recipients: AlertRecipient[];
  channels: AlertChannel[];
}
