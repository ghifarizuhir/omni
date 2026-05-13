import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { capacityService, useResource } from '../../services';

interface MetricSparklineProps {
  metricId: string;
  warningThreshold?: number;
  criticalThreshold?: number;
  height?: number;
}

function getLineColor(lastValue: number, warningThreshold?: number, criticalThreshold?: number): string {
  if (criticalThreshold !== undefined && lastValue >= criticalThreshold) return '#F04438';
  if (warningThreshold !== undefined && lastValue >= warningThreshold) return '#F79009';
  return '#12B76A';
}

export function MetricSparkline({
  metricId,
  warningThreshold,
  criticalThreshold,
  height = 40,
}: MetricSparklineProps) {
  const { data } = useResource(() => capacityService.timeSeriesForMetric(metricId), [metricId]);
  const series = data ?? [];
  if (series.length === 0) return null;

  const lastValue = series[series.length - 1]?.value ?? 0;
  const color = getLineColor(lastValue, warningThreshold, criticalThreshold);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={series} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
