import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';

interface MTTRDataPoint {
  date: string;
  mttr: number;
  mtbf: number;
  mtrs: number;
}

function generateMTTRData(): MTTRDataPoint[] {
  const data: MTTRDataPoint[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString('default', { month: 'short', day: 'numeric' });
    // MTTR: ~25 min baseline with occasional spikes
    const spike = i === 7 || i === 18 ? 60 + Math.random() * 30 : 0;
    const mttr = Math.max(10, 22 + Math.random() * 8 + spike);
    const mtbf = 1800 + Math.random() * 600; // in minutes (~1.5-2 days)
    const mtrs = Math.max(5, 18 + Math.random() * 10 + spike * 0.6);
    data.push({ date: label, mttr: +mttr.toFixed(1), mtbf: +mtbf.toFixed(0), mtrs: +mtrs.toFixed(1) });
  }
  return data;
}

const chartData = generateMTTRData();

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-gray-200 bg-white p-2 shadow-md text-xs space-y-1">
      <p className="font-semibold text-gray-700">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value} min
        </p>
      ))}
    </div>
  );
}

interface MTTRTrendChartProps {
  data?: MTTRDataPoint[];
  height?: number;
}

export function MTTRTrendChart({ data = chartData, height = 200 }: MTTRTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F7" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: '#98A2B3' }}
          tickLine={false}
          axisLine={false}
          interval={6}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#98A2B3' }}
          tickLine={false}
          axisLine={false}
          unit=" min"
          width={52}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
        />
        <ReferenceLine
          y={30}
          stroke="#F04438"
          strokeDasharray="4 4"
          label={{ value: 'Target: 30m', position: 'insideTopRight', fontSize: 10, fill: '#F04438' }}
        />
        <Line
          type="monotone"
          dataKey="mttr"
          name="MTTR"
          stroke="#F04438"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="mtrs"
          name="MTRS"
          stroke="#0BA5EC"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="mtbf"
          name="MTBF (min)"
          stroke="#12B76A"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
