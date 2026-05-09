import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { Outage } from '../../types';

interface OutageVolumeBarChartProps {
  outages: Outage[];
}

const SEVERITY_COLORS: Record<string, string> = {
  P1: '#F04438',
  P2: '#FB923C',
  P3: '#F79009',
  P4: '#12B76A',
};

function getWeekLabel(startOfWeek: Date): string {
  const month = startOfWeek.toLocaleString('default', { month: 'short' });
  const weekOfMonth = Math.ceil((startOfWeek.getDate()) / 7);
  return `${month} W${weekOfMonth}`;
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

interface WeekBucket {
  label: string;
  weekStart: Date;
  P1: number;
  P2: number;
  P3: number;
  P4: number;
}

export function OutageVolumeBarChart({ outages }: OutageVolumeBarChartProps) {
  // Last 13 weeks
  const now = new Date();
  const weeks: WeekBucket[] = [];
  for (let i = 12; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    const weekStart = getStartOfWeek(d);
    weeks.push({ label: getWeekLabel(weekStart), weekStart, P1: 0, P2: 0, P3: 0, P4: 0 });
  }

  for (const outage of outages) {
    const date = new Date(outage.startedAt);
    const weekStart = getStartOfWeek(date);
    const bucket = weeks.find(
      (w) => w.weekStart.getTime() === weekStart.getTime(),
    );
    if (bucket && outage.severity in bucket) {
      const key = outage.severity as 'P1' | 'P2' | 'P3' | 'P4';
      bucket[key] = bucket[key] + 1;
    }
  }

  const chartData = weeks.map(({ label, P1, P2, P3, P4 }) => ({ label, P1, P2, P3, P4 }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F7" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 9, fill: '#98A2B3' }}
          tickLine={false}
          axisLine={false}
          interval={1}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 10, fill: '#98A2B3' }}
          tickLine={false}
          axisLine={false}
          width={24}
        />
        <Tooltip
          contentStyle={{ fontSize: 11, borderRadius: 6 }}
          itemStyle={{ padding: '1px 0' }}
        />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
        {(['P1', 'P2', 'P3', 'P4'] as const).map((sev) => (
          <Bar key={sev} dataKey={sev} stackId="a" fill={SEVERITY_COLORS[sev]} maxBarSize={28} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
