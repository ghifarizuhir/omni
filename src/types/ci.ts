import { User, ServiceHealthStatus } from './common';

// 8 CI types — lean coverage
export type CIType =
  | 'server'         // Physical or virtual server
  | 'application'    // Deployed application/service component
  | 'database'       // DB instance (Postgres, MySQL, etc.)
  | 'load_balancer'  // LB / reverse proxy
  | 'service'        // Logical service (business-facing)
  | 'network'        // Network device (router, switch, VPC)
  | 'storage'        // Storage volume / S3 bucket / NAS
  | 'endpoint';      // External endpoint / API consumer

// CI lifecycle status
export type CIStatus =
  | 'active'         // In production use
  | 'planned'        // Approved but not yet deployed
  | 'maintenance'    // Currently in maintenance window
  | 'retired'        // Decommissioned but still in CMDB for audit
  | 'unknown';       // Discovery agent reports but not classified

// Environment
export type Environment = 'production' | 'staging' | 'development' | 'test';

// Criticality (drives monitoring, change risk, on-call routing)
export type Criticality = 'critical' | 'high' | 'medium' | 'low';

// Relationship types (typed edges per ITIL CMDB)
export type RelationshipType =
  | 'depends_on'     // A needs B to function
  | 'contains'       // A is composed of B (parent-child)
  | 'runs_on'        // A is hosted on B (app-on-server)
  | 'connects_to'    // A communicates with B
  | 'managed_by'     // A is managed by team B
  | 'part_of';       // A is a member of service B

export interface ServerAttributes {
  kind: 'server';
  os: string;                  // e.g. "Ubuntu 22.04 LTS"
  cpuCores: number;
  memoryGb: number;
  diskGb: number;
  ipAddress: string;
  hostname: string;
  region: string;              // e.g. "us-east-1"
  provider: 'aws' | 'gcp' | 'azure' | 'on-prem';
}

export interface ApplicationAttributes {
  kind: 'application';
  version: string;             // e.g. "2.4.1"
  language: string;            // e.g. "Node.js 20", "Java 17"
  port: number;
  healthCheckPath: string;     // e.g. "/health"
  repoUrl: string;
}

export interface DatabaseAttributes {
  kind: 'database';
  engine: 'postgresql' | 'mysql' | 'mongodb' | 'redis' | 'elasticsearch';
  version: string;
  port: number;
  storageGb: number;
  replicas: number;
  backupSchedule: string;      // e.g. "daily 02:00 UTC"
}

export interface LoadBalancerAttributes {
  kind: 'load_balancer';
  type: 'application' | 'network';
  scheme: 'internet-facing' | 'internal';
  listeners: Array<{ port: number; protocol: 'HTTP' | 'HTTPS' | 'TCP' }>;
  vipAddress: string;
}

export interface ServiceAttributes {
  kind: 'service';
  tier: 'critical' | 'important' | 'standard';
  slaTarget: number;           // %
  businessOwner: string;
  customerFacing: boolean;
}

export interface NetworkAttributes {
  kind: 'network';
  deviceType: 'router' | 'switch' | 'firewall' | 'vpc' | 'subnet';
  cidr?: string;
  region: string;
  vendor?: string;
}

export interface StorageAttributes {
  kind: 'storage';
  storageType: 's3_bucket' | 'block_volume' | 'file_share';
  capacityGb: number;
  usedGb: number;
  encryption: boolean;
}

export interface EndpointAttributes {
  kind: 'endpoint';
  url: string;
  protocol: 'HTTPS' | 'HTTP' | 'gRPC' | 'AMQP';
  authType: 'api_key' | 'oauth2' | 'mtls' | 'none';
  externalProvider?: string;   // e.g. "Stripe", "Twilio"
}

// Type-specific attribute shapes (union)
export type CIAttributes =
  | ServerAttributes
  | ApplicationAttributes
  | DatabaseAttributes
  | LoadBalancerAttributes
  | ServiceAttributes
  | NetworkAttributes
  | StorageAttributes
  | EndpointAttributes;

// Configuration Item
export interface ConfigurationItem {
  id: string;                  // UUID v7 (internal)
  publicId: string;            // Human-readable, e.g. "CI-WEB-PROD-001"
  name: string;                // Display name, e.g. "web-prod-01"
  type: CIType;
  status: CIStatus;
  environment: Environment;
  criticality: Criticality;

  // Ownership
  ownerId?: string;            // user id (responsible person); optional — unowned CIs surface in completeness panel
  ownerTeamId: string;         // team id

  // Service context
  serviceId?: string;          // Which logical service this CI belongs to (optional for infra-only)

  // Health (derived from monitoring; here mocked)
  health: ServiceHealthStatus;

  // Type-specific attributes (loose typed for flexibility)
  attributes: CIAttributes;

  // Tags for filtering/grouping
  tags: string[];

  // Audit timestamps
  createdAt: string;           // ISO
  updatedAt: string;
  lastDiscoveredAt?: string;   // When discovery agent last saw it

  // Linked resources (counts for badge display; details fetched on demand)
  openIncidentCount: number;   // Active incidents linked to this CI
  recentChangeCount: number;   // Changes in last 30 days
  monitoringRuleCount: number; // Active monitoring rules
}

// Relationship (graph edge)
export interface CIRelationship {
  id: string;
  fromCiId: string;            // Source CI internal id
  toCiId: string;              // Target CI internal id
  type: RelationshipType;
  description?: string;        // Optional human note
  createdAt: string;
}

// Audit log entry
export interface CIAuditEntry {
  id: string;
  ciId: string;
  ciPublicId: string;          // Denormalized for display
  ciName: string;              // Denormalized for display
  action: 'created' | 'updated' | 'deleted' | 'relationship_added' | 'relationship_removed' | 'status_changed' | 'discovered';
  actorId: string;             // user id (or 'system' for discovery agent)
  actorName: string;           // Denormalized
  actorType: 'user' | 'system' | 'integration';
  field?: string;              // Field changed (for updates)
  before?: string | number | boolean | null;
  after?: string | number | boolean | null;
  source: 'manual' | 'discovery' | 'api' | 'deployment';  // Where the change originated
  description?: string;        // Optional human note
  timestamp: string;            // ISO
}
