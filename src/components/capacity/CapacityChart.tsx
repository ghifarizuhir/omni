import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { CapacityMetric } from '../../types';
import { getTimeSeriesForMetric } from '../../mocks/capacityTimeSeries';

interface CapacityChartProps {
  metricId: string;
  metric: CapacityMetric;
  height?: number;
  showThresholds?: boolean;
  showBaseline?: boolean;
  showForecast?: boolean;
}

interface TooltipPayloadEntry {
  name?: string;
  value?: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

function formatDate(timestamp: string): string {
  const d = new Date(timestamp);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0];
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-medium text-gray-700">{label}</p>
      <p className="text-gray-900">
        {point.name}: <span className="font-semibold">{point.value}</span>
      </p>
    </div>
  );
}

export function CapacityChart({
  metricId,
  metric,
  height = 200,
  showThresholds = true,
  showBaseline = false,
}: CapacityChartProps) {
  const rawData = getTimeSeriesForMetric(metricId);
  const data = rawData.map(d => ({
    ...d,
    date: formatDate(d.timestamp),
    value: d.value,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`grad-${metricId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#12B76A" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#F04438" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F7" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#667085' }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#667085' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={v => `${v} ${metric.unit}`}
          width={60}
        />
        <Tooltip content={<CustomTooltip />} />

        {showThresholds && (
          <>
            <ReferenceLine
              y={metric.warningThreshold}
              stroke="#F79009"
              strokeDasharray="4 2"
              label={{ value: 'Warning', position: 'insideTopRight', fontSize: 10, fill: '#F79009' }}
            />
            <ReferenceLine
              y={metric.criticalThreshold}
              stroke="#F04438"
              strokeDasharray="4 2"
              label={{ value: 'Critical', position: 'insideTopRight', fontSize: 10, fill: '#F04438' }}
            />
          </>
        )}

        {showBaseline && metric.baselineValue !== undefined && (
          <ReferenceLine
            y={metric.baselineValue}
            stroke="#98A2B3"
            strokeDasharray="4 2"
            label={{ value: 'Baseline', position: 'insideTopRight', fontSize: 10, fill: '#98A2B3' }}
          />
        )}

        <ReferenceLine
          y={metric.capacityValue}
          stroke="#667085"
          strokeWidth={1}
          label={{ value: 'Capacity', position: 'insideTopRight', fontSize: 10, fill: '#667085' }}
        />

        <Area
          type="monotone"
          dataKey="value"
          stroke="#1F4FD4"
          strokeWidth={2}
          fill={`url(#grad-${metricId})`}
          isAnimationActive={false}
          name={metric.unit}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
