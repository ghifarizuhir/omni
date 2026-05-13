import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardBody } from '@/src/components/ui/Card';
import { KPICard } from '@/src/components/ui/KPICard';
import { CriticalMetricsHero } from '@/src/components/capacity/CriticalMetricsHero';
import { MetricCard } from '@/src/components/capacity/MetricCard';
import { MetricExpandedDetail } from '@/src/components/capacity/MetricExpandedDetail';
import { ScalingRecommendationCard } from '@/src/components/capacity/ScalingRecommendationCard';
import { mockCapacityMetrics, getCriticalMetrics } from '@/src/mocks/capacityMetrics';
import { mockCapacityThresholds } from '@/src/mocks/capacityThresholds';
import { mockScalingRecommendations, getOpenRecommendations } from '@/src/mocks/scalingRecommendations';

export default function CapacityDashboard() {
  const [expandedMetricId, setExpandedMetricId] = useState<string | null>(null);

  const criticalMetrics = getCriticalMetrics();
  const openRecs = getOpenRecommendations();

  // Group open recommendations by priority
  const recsByPriority = (['urgent', 'high', 'medium', 'low'] as const).reduce(
    (acc, priority) => {
      const recs = openRecs.filter(r => r.priority === priority);
      if (recs.length > 0) acc[priority] = recs;
      return acc;
    },
    {} as Record<string, typeof openRecs>,
  );

  const enabledThresholds = mockCapacityThresholds.filter(t => t.enabled);
  const triggeringThresholds = mockCapacityThresholds.filter(t => t.triggerCount30d > 0 && t.enabled);
  const totalTriggerCount30d = mockCapacityThresholds.reduce((sum, t) => sum + t.triggerCount30d, 0);

  const urgentRecs = mockScalingRecommendations.filter(r => r.priority === 'urgent');
  const highRecs = mockScalingRecommendations.filter(r => r.priority === 'high' && r.status !== 'dismissed');

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard
          label="Avg CPU (24h)"
          value="62%"
          trend={8}
          trendLabel="vs prev week"
          trendBetter="low"
        />
        <KPICard
          label="Avg Memory (24h)"
          value="71%"
          trend={3}
          trendLabel="vs prev week"
          trendBetter="low"
        />
        <KPICard
          label="Scaling Recs"
          value={openRecs.length}
          subDetail={`${urgentRecs.length} urgent · ${highRecs.length} high`}
        />
        <KPICard
          label="Forecast Alerts"
          value="4"
          subDetail="Within 14 days"
        />
      </div>

      {/* Critical Metrics Hero */}
      {criticalMetrics.length > 0 && (
        <CriticalMetricsHero
          metrics={criticalMetrics}
          onViewMetric={(id) => setExpandedMetricId(id)}
        />
      )}

      {/* Main Content: left column + right rail */}
      <div className="flex gap-6 items-start">
        {/* Left column — All Capacity Metrics */}
        <div className="flex-1 min-w-0 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            All Capacity Metrics
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {mockCapacityMetrics.map(metric => (
              <div key={metric.id} className="contents">
                <MetricCard
                  metric={metric}
                  onClick={() =>
                    setExpandedMetricId(expandedMetricId === metric.id ? null : metric.id)
                  }
                  isExpanded={expandedMetricId === metric.id}
                />
                {expandedMetricId === metric.id && (
                  <div className="col-span-2">
                    <MetricExpandedDetail
                      metric={metric}
                      onClose={() => setExpandedMetricId(null)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right rail */}
        <div className="w-72 shrink-0 space-y-4 sticky top-6">
          {/* Card 1: Active Recommendations */}
          <Card>
            <CardBody className="p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-800">Active Recommendations</h3>
              {Object.entries(recsByPriority).map(([priority, recs]) => (
                <div key={priority} className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {priority}
                  </p>
                  {recs.map(rec => (
                    <div key={rec.id}>
                      <ScalingRecommendationCard rec={rec} compact />
                    </div>
                  ))}
                </div>
              ))}
              <Link
                to="/capacity/forecast"
                className="block text-xs text-blue-600 hover:text-blue-800 font-medium pt-1"
              >
                View all →
              </Link>
            </CardBody>
          </Card>

          {/* Card 2: Threshold Status */}
          <Card>
            <CardBody className="p-4 space-y-2">
              <h3 className="text-sm font-semibold text-gray-800">Threshold Status</h3>
              <div className="space-y-1.5 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Active</span>
                  <span className="font-medium text-gray-800">
                    {enabledThresholds.length} / {mockCapacityThresholds.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Triggering now</span>
                  <span className="font-medium text-orange-600">{triggeringThresholds.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Triggered (30d)</span>
                  <span className="font-medium text-gray-800">{totalTriggerCount30d}</span>
                </div>
              </div>
              <Link
                to="/capacity/thresholds"
                className="block text-xs text-blue-600 hover:text-blue-800 font-medium pt-1"
              >
                Manage →
              </Link>
            </CardBody>
          </Card>

          {/* Card 3: Change Linkage */}
          <Card>
            <CardBody className="p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-800">Change Linkage</h3>
              <p className="text-xs text-gray-500">Capacity-driven changes:</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center justify-between">
                  <Link
                    to="/changes/chg-2026-00089"
                    className="font-mono text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    CHG-2026-00089
                  </Link>
                  <span className="text-xs text-gray-500">order replicas</span>
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700">
                    closed
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <Link
                    to="/changes/chg-2026-00091"
                    className="font-mono text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    CHG-2026-00091
                  </Link>
                  <span className="text-xs text-gray-500">pgbouncer</span>
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">
                    in review
                  </span>
                </li>
              </ul>
              <button className="text-xs text-blue-600 hover:text-blue-800 font-medium pt-1">
                View change history →
              </button>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
