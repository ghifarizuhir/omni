import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

interface SLAComplianceDonutProps {
  meeting: number;
  atRisk: number;
  breached: number;
}

const COLORS = {
  Meeting:  '#12B76A',
  'At Risk': '#F79009',
  Breached: '#F04438',
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-md border border-gray-200 bg-white p-2 shadow-md text-xs">
      <p className="font-medium">{item.name}: {item.value}</p>
    </div>
  );
}

interface LabelProps {
  cx: number;
  cy: number;
  meeting: number;
  total: number;
}

function CenterLabel({ cx, cy, meeting, total }: LabelProps) {
  return (
    <>
      <text x={cx} y={cy - 6} textAnchor="middle" dominantBaseline="middle" className="fill-gray-900" style={{ fontSize: 18, fontWeight: 700 }}>
        {meeting}/{total}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" dominantBaseline="middle" className="fill-gray-500" style={{ fontSize: 10 }}>
        Meeting
      </text>
    </>
  );
}

export function SLAComplianceDonut({ meeting, atRisk, breached }: SLAComplianceDonutProps) {
  const total = meeting + atRisk + breached;
  const chartData = [
    { name: 'Meeting',  value: meeting },
    { name: 'At Risk',  value: atRisk },
    { name: 'Breached', value: breached },
  ].filter((d) => d.value > 0);

  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={72}
          paddingAngle={2}
          dataKey="value"
        >
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={COLORS[entry.name as keyof typeof COLORS] ?? '#98A2B3'} />
          ))}
          <CenterLabel cx={0} cy={0} meeting={meeting} total={total} />
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
