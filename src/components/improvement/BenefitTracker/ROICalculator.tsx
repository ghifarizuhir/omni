import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { BenefitType } from '../../../types/improvement';
import { benefitTypeMeta, formatBenefitUSD } from '../../../lib/constants';
import { Button } from '../../ui/Button';

const BENEFIT_TYPES = Object.keys(benefitTypeMeta) as BenefitType[];

const SCENARIO_COLORS: Record<string, string> = {
  Pessimistic: '#F79009',
  Base: '#1F4FD4',
  Optimistic: '#12B76A',
};

export function ROICalculator() {
  const [effortDays, setEffortDays] = useState(12);
  const [dailyRate, setDailyRate] = useState(800);
  const [ongoingMonthly, setOngoingMonthly] = useState(200);
  const [annualBenefit, setAnnualBenefit] = useState(320000);
  const [confidence, setConfidence] = useState<'low' | 'medium' | 'high'>('medium');
  const [benefitType, setBenefitType] = useState<BenefitType>('risk_reduction');

  const computed = useMemo(() => {
    const implCost = effortDays * dailyRate;
    const totalCost12m = implCost + ongoingMonthly * 12;
    const roi12m = totalCost12m > 0 ? ((annualBenefit - totalCost12m) / totalCost12m) * 100 : 0;
    const paybackMonths = annualBenefit > 0 ? totalCost12m / (annualBenefit / 12) : 0;

    let npv5y = -implCost;
    for (let year = 1; year <= 5; year++) {
      npv5y += annualBenefit / Math.pow(1.03, year);
    }
    npv5y -= ongoingMonthly * 12 * 5;

    const pessimisticROI = roi12m * 0.5;
    const optimisticROI = roi12m * 1.25;

    return { implCost, totalCost12m, roi12m, paybackMonths, npv5y, pessimisticROI, optimisticROI };
  }, [effortDays, dailyRate, ongoingMonthly, annualBenefit]);

  const scenarioData = [
    { name: 'Pessimistic', roi: computed.pessimisticROI },
    { name: 'Base', roi: computed.roi12m },
    { name: 'Optimistic', roi: computed.optimisticROI },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-5">
        {/* COSTS */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Costs</p>
          <div>
            <label className="text-xs text-gray-600 block mb-1">Effort (days)</label>
            <input
              type="number"
              min={0}
              value={effortDays}
              onChange={(e) => setEffortDays(Number(e.target.value))}
              className="w-full rounded border border-gray-200 text-sm px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">Daily rate (USD)</label>
            <input
              type="number"
              min={0}
              value={dailyRate}
              onChange={(e) => setDailyRate(Number(e.target.value))}
              className="w-full rounded border border-gray-200 text-sm px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">Ongoing/month (USD)</label>
            <input
              type="number"
              min={0}
              value={ongoingMonthly}
              onChange={(e) => setOngoingMonthly(Number(e.target.value))}
              className="w-full rounded border border-gray-200 text-sm px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
          <div className="pt-2 border-t border-gray-100">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Impl. cost</span>
              <span className="font-medium">${computed.implCost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-600 font-semibold">Total (12m)</span>
              <span className="font-bold">${computed.totalCost12m.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* BENEFITS */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Benefits</p>
          <div>
            <label className="text-xs text-gray-600 block mb-1">Annual benefit (USD)</label>
            <input
              type="number"
              min={0}
              value={annualBenefit}
              onChange={(e) => setAnnualBenefit(Number(e.target.value))}
              className="w-full rounded border border-gray-200 text-sm px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">Confidence</label>
            <select
              className="w-full rounded border border-gray-200 text-sm px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
              value={confidence}
              onChange={(e) => setConfidence(e.target.value as 'low' | 'medium' | 'high')}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">Benefit type</label>
            <select
              className="w-full rounded border border-gray-200 text-sm px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
              value={benefitType}
              onChange={(e) => setBenefitType(e.target.value as BenefitType)}
            >
              {BENEFIT_TYPES.map((t) => (
                <option key={t} value={t}>{benefitTypeMeta[t].label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* RESULTS */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Results</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-xs text-gray-500">12m ROI</p>
            <p className="text-2xl font-bold text-blue-700">{computed.roi12m.toFixed(0)}%</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Payback</p>
            <p className="text-2xl font-bold text-gray-800">
              {computed.paybackMonths < 1 ? '< 1 mo' : `${computed.paybackMonths.toFixed(1)} mo`}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">5Y NPV</p>
            <p className="text-2xl font-bold text-green-700">{formatBenefitUSD(computed.npv5y)}</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={scenarioData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#667085' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#98A2B3' }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => `${Math.round(v)}%`} />
            <Tooltip formatter={(v: number) => [`${v.toFixed(0)}%`, 'ROI']} contentStyle={{ fontSize: 12, borderRadius: 6 }} />
            <Bar dataKey="roi" maxBarSize={48} radius={[4, 4, 0, 0]}>
              {scenarioData.map((entry) => (
                <Cell key={entry.name} fill={SCENARIO_COLORS[entry.name]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <Button variant="outline" className="w-full">
        Create initiative from this calculation →
      </Button>
    </div>
  );
}
