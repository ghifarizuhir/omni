import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { CapacityForecast, CapacityMetric } from '../../types';
import { capacityService, useResource } from '../../services';

interface ForecastChartProps {
  forecast: CapacityForecast;
  metric: CapacityMetric;
  height?: number;
}

interface ChartPoint {
  date: string;
  historical?: number;
  predicted?: number;
  lowerBound?: number;
  bandHeight?: number;
  capacity: number;
}

interface TooltipPayloadEntry {
  dataKey?: string;
  value?: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const hist = payload.find(p => p.dataKey === 'historical');
  const pred = payload.find(p => p.dataKey === 'predicted');
  const lower = payload.find(p => p.dataKey === 'lowerBound');
  const band = payload.find(p => p.dataKey === 'bandHeight');

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs space-y-1">
      <p className="font-semibold text-gray-700">{label}</p>
      {hist?.value !== undefined && (
        <p className="text-blue-700">Actual: <span className="font-medium">{hist.value}</span></p>
      )}
      {pred?.value !== undefined && (
        <p className="text-purple-700">
          Predicted: <span className="font-medium">{pred.value}</span>
          {lower?.value !== undefined && band?.value !== undefined && (
            <span className="text-gray-400 ml-1">
              [{Number(lower.value).toFixed(1)} – {(Number(lower.value) + Number(band.value)).toFixed(1)}]
            </span>
          )}
        </p>
      )}
    </div>
  );
}

export function ForecastChart({ forecast, metric, height = 250 }: ForecastChartProps) {
  const { data: historicalRaw } = useResource(() => capacityService.timeSeriesForMetric(metric.id), [metric.id]);

  const historicalPoints: ChartPoint[] = (historicalRaw ?? []).map(d => ({
    date: d.timestamp.split('T')[0],
    historical: d.value,
    capacity: d.capacity,
  }));

  const forecastPoints: ChartPoint[] = forecast.predictions.map(p => ({
    date: p.date,
    predicted: p.predictedValue,
    lowerBound: p.confidenceLowerBound,
    bandHeight: Math.max(0, p.confidenceUpperBound - p.confidenceLowerBound),
    capacity: metric.capacityValue,
  }));

  // Merge: forecast may overlap with historical
  const historicalDates = new Set(historicalPoints.map(p => p.date));
  const uniqueForecast = forecastPoints.filter(p => !historicalDates.has(p.date));

  const data: ChartPoint[] = [...historicalPoints, ...uniqueForecast].sort(
    (a, b) => a.date.localeCompare(b.date),
  );

  const today = '2026-05-08';

  const displayData = data.map(d => ({
    ...d,
    displayDate: formatDate(d.date),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={displayData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="conf-band-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6941C6" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#6941C6" stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F7" />
        <XAxis
          dataKey="displayDate"
          tick={{ fontSize: 10, fill: '#667085' }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#667085' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={v => `${v}`}
          width={50}
        />
        <Tooltip content={<CustomTooltip />} />

        {/* Confidence band — lower baseline */}
        <Area
          type="monotone"
          dataKey="lowerBound"
          stroke="none"
          fill="none"
          isAnimationActive={false}
          legendType="none"
        />
        {/* Confidence band — upper fill */}
        <Area
          type="monotone"
          dataKey="bandHeight"
          stackId="conf"
          stroke="none"
          fill="url(#conf-band-grad)"
          baseValue="dataMin"
          isAnimationActive={false}
          legendType="none"
        />

        {/* Threshold reference lines */}
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

        {/* Today marker */}
        <ReferenceLine
          x={formatDate(today)}
          stroke="#1F4FD4"
          strokeDasharray="4 2"
          label={{ value: 'Today', position: 'insideTopLeft', fontSize: 10, fill: '#1F4FD4' }}
        />

        {/* Historical line */}
        <Line
          type="monotone"
          dataKey="historical"
          stroke="#1F4FD4"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
          name="Actual"
        />

        {/* Predicted line */}
        <Line
          type="monotone"
          dataKey="predicted"
          stroke="#6941C6"
          strokeWidth={2}
          strokeDasharray="5 3"
          dot={false}
          isAnimationActive={false}
          name="Predicted"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
