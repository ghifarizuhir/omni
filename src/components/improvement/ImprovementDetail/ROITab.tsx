import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { ImprovementInitiative, ROICalculation } from '../../../types/improvement';
import { formatBenefitUSD } from '../../../lib/constants';

interface ROITabProps {
  initiative: ImprovementInitiative;
  roiCalc?: ROICalculation | null;
}

const SCENARIO_COLORS: Record<string, string> = {
  Pessimistic: '#F79009',
  Base: '#1F4FD4',
  Optimistic: '#12B76A',
};

export function ROITab({ initiative, roiCalc }: ROITabProps) {
  if (!roiCalc) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-gray-400 italic">
          ROI analysis will be available once the initiative is approved.
        </p>
      </div>
    );
  }

  const scenarioData = [
    { name: 'Pessimistic', roi: roiCalc.pessimisticROI },
    { name: 'Base', roi: roiCalc.roi12mPercent },
    { name: 'Optimistic', roi: roiCalc.optimisticROI },
  ];

  const hasActual = initiative.actualCostUSD != null;

  return (
    <div className="space-y-6 py-4">
      {/* ESTIMATED */}
      <section>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Estimated</p>
        <div className="grid grid-cols-2 gap-4">
          {/* Investment table */}
          <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
            <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-600">Investment</p>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-3 py-2 text-gray-600">Implementation cost</td>
                  <td className="px-3 py-2 text-right font-medium">${roiCalc.implementationCostUSD.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 text-gray-600">Ongoing/month</td>
                  <td className="px-3 py-2 text-right font-medium">${roiCalc.ongoingMonthlyCostUSD.toLocaleString()}</td>
                </tr>
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-3 py-2 text-gray-700">Total (12m)</td>
                  <td className="px-3 py-2 text-right">${roiCalc.totalCost12mUSD.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
          {/* Returns */}
          <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
            <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-600">Returns</p>
            </div>
            <div className="p-3 space-y-2">
              <div>
                <p className="text-xs text-gray-500">Projected annual benefit</p>
                <p className="text-lg font-bold text-green-700">{formatBenefitUSD(roiCalc.projectedAnnualBenefitUSD)}</p>
              </div>
              <p className="text-xs text-gray-600">{initiative.estimatedBenefit.description}</p>
            </div>
          </div>
        </div>

        {/* ROI metrics */}
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
            <p className="text-xs text-gray-500">12m ROI</p>
            <p className="text-xl font-bold text-blue-700">{roiCalc.roi12mPercent.toFixed(0)}%</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
            <p className="text-xs text-gray-500">Payback</p>
            <p className="text-xl font-bold text-gray-800">
              {roiCalc.paybackMonths < 1 ? '< 1 mo' : `${roiCalc.paybackMonths.toFixed(1)} mo`}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
            <p className="text-xs text-gray-500">5Y NPV</p>
            <p className="text-xl font-bold text-green-700">{formatBenefitUSD(roiCalc.npv5yUSD)}</p>
          </div>
        </div>

        {/* Scenario analysis */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 mt-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Scenario Analysis</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={scenarioData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#667085' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#98A2B3' }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v: number) => [`${v.toFixed(0)}%`, 'ROI']} contentStyle={{ fontSize: 12, borderRadius: 6 }} />
              <Bar dataKey="roi" maxBarSize={56} radius={[4, 4, 0, 0]}>
                {scenarioData.map((entry) => (
                  <Cell key={entry.name} fill={SCENARIO_COLORS[entry.name]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ACTUAL (only if actualCostUSD is set) */}
      {hasActual && (
        <section>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Actual vs Estimated</p>
          <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Metric</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Estimated</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actual</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-4 py-2 text-gray-700">Cost (USD)</td>
                  <td className="px-4 py-2 text-right text-gray-600">${initiative.estimatedCostUSD.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right font-medium">${initiative.actualCostUSD!.toLocaleString()}</td>
                  <td className="px-4 py-2">
                    {initiative.actualCostUSD! <= initiative.estimatedCostUSD ? (
                      <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle size={14} /> Under budget</span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-red-600"><XCircle size={14} /> Over budget</span>
                    )}
                  </td>
                </tr>
                {initiative.actualEffortDays != null && (
                  <tr>
                    <td className="px-4 py-2 text-gray-700">Effort (days)</td>
                    <td className="px-4 py-2 text-right text-gray-600">{initiative.estimatedEffortDays}</td>
                    <td className="px-4 py-2 text-right font-medium">{initiative.actualEffortDays}</td>
                    <td className="px-4 py-2">
                      {initiative.actualEffortDays! <= initiative.estimatedEffortDays ? (
                        <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle size={14} /> On track</span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-red-600"><XCircle size={14} /> Over estimate</span>
                      )}
                    </td>
                  </tr>
                )}
                {initiative.actualBenefitUSD != null && (
                  <tr>
                    <td className="px-4 py-2 text-gray-700">Benefit (USD)</td>
                    <td className="px-4 py-2 text-right text-gray-600">{formatBenefitUSD(initiative.estimatedBenefit.annualValueUSD)}</td>
                    <td className="px-4 py-2 text-right font-medium">{formatBenefitUSD(initiative.actualBenefitUSD!)}</td>
                    <td className="px-4 py-2">
                      {initiative.actualBenefitUSD! >= initiative.estimatedBenefit.annualValueUSD ? (
                        <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle size={14} /> Met target</span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-red-600"><XCircle size={14} /> Below target</span>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
