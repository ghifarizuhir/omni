import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, XCircle } from 'lucide-react';
import { ImprovementInitiative } from '../../../types/improvement';

interface MetricsTabProps {
  initiative: ImprovementInitiative;
}

export function MetricsTab({ initiative }: MetricsTabProps) {
  return (
    <div className="py-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Success Metrics</p>
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Metric</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Current</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Target</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Achieved</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {initiative.successMetrics.map((m, i) => {
              const hasAchieved = m.achievedValue != null;
              const targetMet = hasAchieved && m.achievedValue! >= m.targetValue;
              return (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {m.metricPublicId ? (
                      <Link
                        to="/metrics/catalog"
                        className="text-blue-600 hover:underline"
                      >
                        {m.metricName}
                      </Link>
                    ) : m.metricName}
                    <span className="ml-1 text-xs text-gray-400">({m.unit})</span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{m.currentValue}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{m.targetValue}</td>
                  <td className="px-4 py-3 text-right">
                    {hasAchieved ? (
                      <span className="font-medium text-gray-800">{m.achievedValue}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {hasAchieved ? (
                      <span className={`flex items-center gap-1 text-xs font-medium ${targetMet ? 'text-green-600' : 'text-red-600'}`}>
                        {targetMet ? <CheckCircle size={14} /> : <XCircle size={14} />}
                        {targetMet ? 'Target met' : 'Target missed'}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 italic">in progress</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {initiative.successMetrics.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-400 italic">
                  No success metrics defined.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
