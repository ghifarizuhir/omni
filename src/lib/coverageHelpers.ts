import { CIType } from '../types/ci';
import { MonitoringRuleType, Severity } from '../types/monitoring';

export interface RuleSuggestion {
  name: string;
  ruleType: MonitoringRuleType;
  severity: Severity;
  defaultQuery: string;
}

export const getSuggestedRulesForCIType = (type: CIType): RuleSuggestion[] => {
  switch (type) {
    case 'database':
      return [
        { 
          name: 'Connection pool utilization > 80%', 
          ruleType: 'threshold', 
          severity: 'P2', 
          defaultQuery: 'avg(pg_stat_activity_count) / max(pg_settings_max_connections) > 0.8' 
        },
        { 
          name: 'Replication lag > 30s', 
          ruleType: 'threshold', 
          severity: 'P3', 
          defaultQuery: 'max(pg_replication_lag_seconds) > 30' 
        },
        { 
          name: 'Disk usage > 85%', 
          ruleType: 'threshold', 
          severity: 'P3', 
          defaultQuery: 'node_filesystem_avail_bytes / node_filesystem_size_bytes < 0.15' 
        },
      ];
    case 'storage':
      return [
        { 
          name: 'Storage capacity > 85%', 
          ruleType: 'threshold', 
          severity: 'P3', 
          defaultQuery: 'aws_s3_bucket_size_bytes / aws_s3_bucket_limit_bytes > 0.85' 
        },
        { 
          name: 'Object count anomaly', 
          ruleType: 'anomaly', 
          severity: 'P3', 
          defaultQuery: 'aws_s3_number_of_objects' 
        },
      ];
    case 'load_balancer':
      return [
        { 
          name: 'Active connections > 90% capacity', 
          ruleType: 'threshold', 
          severity: 'P2', 
          defaultQuery: 'active_connections / lb_max_capacity > 0.9' 
        },
        { 
          name: '5xx response rate > 1%', 
          ruleType: 'threshold', 
          severity: 'P2', 
          defaultQuery: 'rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.01' 
        },
        { 
          name: 'Health check failure', 
          ruleType: 'synthetic', 
          severity: 'P1', 
          defaultQuery: 'probe_success == 0' 
        },
      ];
    case 'application':
      return [
        { 
          name: 'Error rate > 1%', 
          ruleType: 'threshold', 
          severity: 'P2', 
          defaultQuery: 'rate(http_server_requests_errors_total[5m]) / rate(http_server_requests_total[5m]) > 0.01' 
        },
        { 
          name: 'Latency p95 > 500ms', 
          ruleType: 'threshold', 
          severity: 'P3', 
          defaultQuery: 'histogram_quantile(0.95, sum(rate(http_server_requests_seconds_bucket[5m])) by (le)) > 0.5' 
        },
      ];
    case 'server':
      return [
        { 
          name: 'CPU usage > 85%', 
          ruleType: 'threshold', 
          severity: 'P3', 
          defaultQuery: '1 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) > 0.85' 
        },
        { 
          name: 'Memory usage > 90%', 
          ruleType: 'threshold', 
          severity: 'P2', 
          defaultQuery: '1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) > 0.9' 
        },
        { 
          name: 'Disk usage > 85%', 
          ruleType: 'threshold', 
          severity: 'P3', 
          defaultQuery: 'node_filesystem_avail_bytes{mountpoint="/"}[5m] / node_filesystem_size_bytes{mountpoint="/"}[5m] < 0.15' 
        },
      ];
    case 'endpoint':
      return [
        { 
          name: 'External endpoint synthetic check', 
          ruleType: 'synthetic', 
          severity: 'P2', 
          defaultQuery: 'probe_success{job="blackbox"} == 0' 
        },
        { 
          name: 'Response time anomaly', 
          ruleType: 'anomaly', 
          severity: 'P3', 
          defaultQuery: 'probe_duration_seconds' 
        },
      ];
    case 'network':
      return [
        { 
          name: 'Packet drop rate > 0.1%', 
          ruleType: 'threshold', 
          severity: 'P3', 
          defaultQuery: 'rate(node_network_receive_drop_total[5m]) / rate(node_network_receive_packets_total[5m]) > 0.001' 
        },
      ];
    default:
      return [];
  }
};
