import React, { useMemo } from 'react';
import { 
  BarChart3, Shield, Monitor, LayoutDashboard, 
  Search, CheckCircle2, AlertCircle, Database,
  ArrowRight, Filter, Download, Zap
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { mockCIs, mockMonitoringRules } from '@/src/mocks';
import { CIType } from '../../types/ci';
import { cn } from '../../lib/utils';

export const MonitoringCoverage: React.FC = () => {
  // Analytical view of monitoring health
  const coverageData = useMemo(() => {
    const ciTypes: CIType[] = ['server', 'application', 'database', 'load_balancer', 'service', 'network', 'storage'];
    
    return ciTypes.map(type => {
      const cisOfType = mockCIs.filter(ci => ci.type === type);
      const totalCIs = cisOfType.length;
      
      // A CI is "covered" if it's explicitly matched by a rule OR matches a selector
      const coveredCIs = cisOfType.filter(ci => {
        return mockMonitoringRules.some(rule => {
          if (!rule.enabled) return false;
          if (rule.targetCIIds.includes(ci.id)) return true;
          if (rule.targetMode === 'selector' && rule.targetSelector) {
            const selector = rule.targetSelector;
            const matchesType = !selector.types || selector.types.includes(ci.type);
            const matchesService = !selector.services || (ci.serviceId && selector.services.includes(ci.serviceId));
            // simplified tag check
            return matchesType && matchesService;
          }
          return false;
        });
      });

      return {
        type,
        total: totalCIs,
        covered: coveredCIs.length,
        percentage: totalCIs > 0 ? (coveredCIs.length / totalCIs) * 100 : 0
      };
    });
  }, []);

  const overallPercentage = useMemo(() => {
    const total = coverageData.reduce((acc, curr) => acc + curr.total, 0);
    const covered = coverageData.reduce((acc, curr) => acc + curr.covered, 0);
    return total > 0 ? (covered / total) * 100 : 0;
  }, [coverageData]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ois-text">Monitoring Coverage</h1>
          <p className="text-sm text-ois-text-muted font-medium mt-1">Audit of monitoring visibility across the infrastructure</p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" className="gap-2 h-9 px-4">
             <Download size={14} /> Export Report
           </Button>
           <Button variant="primary" size="sm" className="gap-2 h-9 px-4">
             <LayoutDashboard size={14} /> Rules Analytics
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-8 lg:col-span-1 flex flex-col items-center justify-center text-center">
           <div className="relative w-48 h-48 mb-6">
              <svg className="w-full h-full transform -rotate-90">
                 <circle
                    className="text-slate-100"
                    strokeWidth="12"
                    stroke="currentColor"
                    fill="transparent"
                    r="80"
                    cx="96"
                    cy="96"
                 />
                 <circle
                    className="text-ois-primary transition-all duration-1000 ease-out"
                    strokeWidth="12"
                    strokeDasharray={2 * Math.PI * 80}
                    strokeDashoffset={2 * Math.PI * 80 * (1 - overallPercentage / 100)}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="80"
                    cx="96"
                    cy="96"
                 />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <span className="text-4xl font-bold text-ois-text">{Math.round(overallPercentage)}%</span>
                 <span className="text-[10px] font-bold text-ois-text-subtle uppercase tracking-widest mt-1">Overall Health</span>
              </div>
           </div>
           <div>
              <p className="text-sm text-ois-text-muted mb-2">Visibility into your infrastructure is above target.</p>
              <Badge variant="neutral" className="bg-emerald-50 text-emerald-700 border-emerald-100 uppercase text-[10px] py-1 px-3">
                 Target: 80% • Status: healthy
              </Badge>
           </div>
        </Card>

        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
           {coverageData.map(item => (
             <Card key={item.type} className="p-5 flex flex-col justify-between">
                <div>
                   <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                         <div className="p-2 bg-ois-surface-muted rounded-lg border border-ois-border">
                            <Monitor size={16} className="text-ois-text-muted" />
                         </div>
                         <h4 className="text-sm font-bold text-ois-text capitalize">{item.type}s</h4>
                      </div>
                      <span className="text-sm font-bold text-ois-text">{Math.round(item.percentage)}%</span>
                   </div>
                   <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-4">
                      <div 
                        className={cn(
                          "h-full transition-all duration-700 delay-300",
                          item.percentage > 90 ? "bg-emerald-500" : item.percentage > 70 ? "bg-ois-primary" : "bg-amber-500"
                        )}
                        style={{ width: `${item.percentage}%` }}
                      />
                   </div>
                   <div className="flex items-center justify-between text-[11px] font-medium text-ois-text-muted">
                      <span>{item.covered} monitored</span>
                      <span>{item.total} total</span>
                   </div>
                </div>
                <div className="mt-4 pt-4 border-t border-ois-border flex justify-end">
                   <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-[10px] font-bold text-ois-primary">
                      Fix Gaps <ArrowRight size={12} />
                   </Button>
                </div>
             </Card>
           ))}
        </div>
      </div>

      <Card className="overflow-hidden border border-ois-border">
        <div className="p-4 bg-ois-surface-muted/30 border-b border-ois-border flex items-center justify-between">
           <h3 className="text-sm font-bold text-ois-text flex items-center gap-2">
             <Shield size={16} className="text-ois-primary" /> Unmonitored Infrastructure (Gaps)
           </h3>
           <div className="flex items-center gap-2">
              <div className="relative w-64">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ois-text-subtle" size={14} />
                 <Input placeholder="Search unmonitored CIs..." className="pl-9 h-8 bg-white text-xs border-ois-border-strong" />
              </div>
              <Button variant="outline" size="sm" className="h-8">
                <Filter size={12} />
              </Button>
           </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-ois-border">
              <tr>
                <th className="px-6 py-3 text-[10px] font-bold text-ois-text-subtle uppercase">Infrastructure CI</th>
                <th className="px-6 py-3 text-[10px] font-bold text-ois-text-subtle uppercase">Type</th>
                <th className="px-6 py-3 text-[10px] font-bold text-ois-text-subtle uppercase">Environment</th>
                <th className="px-6 py-3 text-[10px] font-bold text-ois-text-subtle uppercase">Status</th>
                <th className="px-6 py-3 text-[10px] font-bold text-ois-text-subtle uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ois-border">
              {mockCIs.slice(0, 8).map(ci => (
                <tr key={ci.id} className="hover:bg-ois-surface-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-slate-100 rounded text-ois-text-subtle">
                         <Database size={14} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-ois-text leading-tight">{ci.name}</p>
                        <p className="text-[10px] font-mono text-ois-text-subtle">{ci.publicId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="neutral" className="text-[10px] font-bold capitalize bg-white text-slate-600">
                      {ci.type}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                     <span className="text-xs font-medium text-ois-text-muted capitalize">{ci.environment}</span>
                  </td>
                  <td className="px-6 py-4">
                     <div className="flex items-center gap-1.5">
                       <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                       <span className="text-xs font-bold text-ois-text-subtle">Untracked</span>
                     </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                     <Button variant="outline" size="sm" className="h-8 gap-2 text-[10px] font-bold bg-white border-ois-border">
                        <Plus size={12} /> Add Rule
                     </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-ois-border bg-slate-50 text-center">
           <Button variant="ghost" size="sm" className="text-[11px] font-bold text-ois-primary">
              View All 15 Unmonitored Assets <ArrowRight size={14} className="ml-2" />
           </Button>
        </div>
      </Card>
    </div>
  );
};

const Plus = ({ size, className }: { size?: number; className?: string }) => (
  <svg width={size || 16} height={size || 16} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);
