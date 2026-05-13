import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert, ShieldCheck, Search, Filter, Layers,
  Database, Server, Globe, Cpu, Radio,
  ChevronDown, ChevronUp, Plus, ArrowRight,
  Zap, Info, AlertTriangle, Eye, Settings,
  BarChart3, RefreshCw, Construction, HardDrive,
  Network, Layout
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import {
  mockCIs,
  mockMonitoringRules,
  mockServices
} from '../../mocks';
import { cn } from '../../lib/utils';
import { CIType, ConfigurationItem } from '../../types/ci';
import { MonitoringRule } from '../../types/monitoring';
import { BulkCreateRulesModal } from '../../components/monitoring/modals/BulkCreateRulesModal';

// Interface for coverage row
interface CoverageRow {
  ci: ConfigurationItem;
  rules: MonitoringRule[];
  suggestedTemplates: string[];
}

export const CoverageReport: React.FC = () => {
  const navigate = useNavigate();

  // --- State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState<'type' | 'service'>('type');
  const [expandedCIs, setExpandedCIs] = useState<Record<string, boolean>>({});
  const [expandedHeroGaps, setExpandedHeroGaps] = useState<Record<string, boolean>>({});
  const [bulkOpen, setBulkOpen] = useState(false);
  const [createdRules, setCreatedRules] = useState<MonitoringRule[]>([]);

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = (message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(message);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 3000);
  };

  // --- Coverage computation from real mock data ---
  const coverageData = useMemo(() => {
    return mockCIs.map(ci => {
      // Find rules that explicitly target this CI by id
      const explicitRules = mockMonitoringRules.filter(rule =>
        rule.targetCIIds?.includes(ci.id)
      );

      // Find selector-based rules that match this CI
      const selectorRules = mockMonitoringRules.filter(rule => {
        if (!rule.enabled) return false;
        if (rule.targetMode !== 'selector' || !rule.targetSelector) return false;
        const sel = rule.targetSelector;
        const matchesType = !sel.types || sel.types.includes(ci.type);
        const matchesService = !sel.services || (ci.serviceId != null && sel.services.includes(ci.serviceId));
        const matchesTags = !sel.tags || sel.tags.every((t: string) => ci.tags?.includes(t));
        const matchesEnv = !sel.environments || sel.environments.includes(ci.environment);
        return matchesType && matchesService && matchesTags && matchesEnv;
      });

      const linkedRules = [...explicitRules, ...selectorRules];

      // Templates based on type
      const templates: Record<CIType, string[]> = {
        'service': ['Available (SLA)', 'Latency (95th)', 'Throughput'],
        'application': ['Error Rate (5xx)', 'Latency', 'Memory Usage', 'Restart Loops'],
        'database': ['Query Latency', 'Connection Count', 'Disk Usage', 'Replication Lag'],
        'server': ['CPU Utilization', 'Memory Scarcity', 'Disk Pressure', 'Load Average'],
        'load_balancer': ['Unhealthy Hosts', 'Spillover', 'Backend Latency'],
        'network': ['Throughput', 'Packet Loss', 'BGP Flap'],
        'storage': ['Capacity Forecast', 'IOPS Limit', 'Access Denied Rate'],
        'endpoint': ['SSL Expiry', 'HTTP Response Time', 'Success Rate']
      };

      return {
        ci,
        rules: linkedRules,
        suggestedTemplates: templates[ci.type] || []
      };
    });
  }, []);

  const criticalGaps = useMemo(() => {
    return coverageData.filter(row => row.ci.criticality === 'critical' && row.rules.length === 0);
  }, [coverageData]);

  const filteredData = useMemo(() => {
    return coverageData.filter(row => {
      const matchSearch = row.ci.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          row.ci.publicId.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    });
  }, [coverageData, searchQuery]);

  const groupedData = useMemo(() => {
    const groups: Record<string, CoverageRow[]> = {};
    filteredData.forEach(row => {
      const key = groupBy === 'type' ? row.ci.type : (row.ci.serviceId || 'independent');
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    });
    return groups;
  }, [filteredData, groupBy]);

  // --- Derived sidebar stats ---
  const coverageByCriticality = useMemo(() => {
    const order = ['critical', 'high', 'medium', 'low'];
    const colorMap: Record<string, string> = {
      critical: 'bg-red-500',
      high: 'bg-orange-500',
      medium: 'bg-amber-500',
      low: 'bg-slate-400',
    };
    return order.map(crit => {
      const group = coverageData.filter(r => r.ci.criticality === crit);
      const covered = group.filter(r => r.rules.length > 0).length;
      return { label: crit.charAt(0).toUpperCase() + crit.slice(1), val: covered, total: group.length, color: colorMap[crit] };
    }).filter(s => s.total > 0);
  }, [coverageData]);

  const coverageByType = useMemo(() => {
    const typeOrder: CIType[] = ['service', 'application', 'database', 'server', 'load_balancer', 'network', 'storage', 'endpoint'];
    const labelMap: Record<string, string> = {
      service: 'Service',
      application: 'Application',
      database: 'Database',
      server: 'Server',
      load_balancer: 'Load Balancer',
      network: 'Network',
      storage: 'Storage',
      endpoint: 'Endpoint',
    };
    return typeOrder.map(type => {
      const group = coverageData.filter(r => r.ci.type === type);
      if (group.length === 0) return null;
      const covered = group.filter(r => r.rules.length > 0).length;
      const pct = covered / group.length;
      const status = pct === 1 ? 'ok' : (pct === 0 && group.some(r => r.ci.criticality === 'critical' || r.ci.criticality === 'high')) ? 'critical' : pct === 0 ? 'optional' : 'warn';
      return { label: labelMap[type], val: covered, total: group.length, status };
    }).filter(Boolean) as { label: string; val: number; total: number; status: string }[];
  }, [coverageData]);

  // --- Derived insights ---
  const insightCriticalGaps = criticalGaps.length;
  const noisyRules = useMemo(() => mockMonitoringRules.filter(r => r.signalToNoiseRatio != null && r.signalToNoiseRatio < 0.5), []);
  const silentRules = useMemo(() => mockMonitoringRules.filter(r => r.totalFires30d === 0), []);

  // --- Helpers ---
  const getCIIcon = (type: CIType) => {
    switch (type) {
      case 'service': return <Layers size={16} />;
      case 'application': return <Cpu size={16} />;
      case 'database': return <Database size={16} />;
      case 'server': return <Server size={16} />;
      case 'load_balancer': return <Globe size={16} />;
      case 'network': return <Network size={16} />;
      case 'storage': return <HardDrive size={16} />;
      case 'endpoint': return <Radio size={16} />;
      default: return <Layout size={16} />;
    }
  };

  const getCriticalityColor = (crit: string) => {
    switch (crit) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">

      {/* Toast — fixed */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-ois-text text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-lg animate-in slide-in-from-bottom-4 duration-200">
          {toastMessage}
        </div>
      )}

      {/* ── Action row ── */}
      <div className="shrink-0 flex items-center justify-end gap-2 px-6 py-2.5 border-b border-ois-border bg-ois-surface">
        <Button variant="ghost" size="sm" className="gap-1.5 text-ois-text-muted">
          <RefreshCw size={13} /> Re-analyze
        </Button>
        <Button variant="primary" size="sm">
          Export Report
        </Button>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto px-6 py-5 space-y-8 pb-20">

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-8">
          {/* Hero Section - Critical Gaps */}
          {criticalGaps.length > 0 && (
            <section className="relative">
              <div className="absolute -top-3 left-6 z-10 bg-ois-danger text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1.5 border border-white/20">
                <ShieldAlert size={12} /> {criticalGaps.length} CRITICAL GAPS DETECTED
              </div>
              <Card className="bg-red-50/30 border-red-200 p-8 pt-10 rounded-2xl shadow-sm">
                <p className="text-sm font-semibold text-red-900 mb-6">These critical CIs have no active monitoring rules. Failure here means flying blind.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {criticalGaps.map(row => (
                    <div key={row.ci.id} className="bg-white border border-red-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500" />
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                            {getCIIcon(row.ci.type)}
                          </div>
                          <div>
                            <p className="font-mono text-[10px] font-semibold text-ois-text-subtle uppercase tracking-widest">{row.ci.publicId}</p>
                            <h4 className="text-sm font-bold text-ois-text">{row.ci.name}</h4>
                          </div>
                        </div>
                        <Badge variant="neutral" className="bg-red-50 text-red-700 border-red-200 uppercase text-[9px] font-bold">
                          {row.ci.type.replace('_', ' ')}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 text-[10px] font-bold text-ois-text-muted uppercase mb-4">
                        <span className="text-red-600">Critical</span>
                        <span className="w-1 h-1 rounded-full bg-ois-border" />
                        <span>{mockServices.find(s => s.id === row.ci.serviceId)?.name || 'Direct Resource'}</span>
                        <span className="w-1 h-1 rounded-full bg-ois-border" />
                        <span className="text-red-500">0 rules</span>
                      </div>

                      <div className="pt-4 border-t border-red-50">
                        <button
                          onClick={() => setExpandedHeroGaps(prev => ({ ...prev, [row.ci.id]: !prev[row.ci.id] }))}
                          className="text-xs font-bold text-ois-primary flex items-center gap-2 hover:underline group/btn"
                        >
                          <ArrowRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform" />
                          Suggest a rule [{row.suggestedTemplates[0]}]
                        </button>

                        {expandedHeroGaps[row.ci.id] && (
                          <div className="mt-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
                            {row.suggestedTemplates.map(tmpl => (
                              <div key={tmpl} className="flex items-center justify-between p-2 rounded-lg bg-ois-bg hover:bg-ois-primary-pale transition-colors group/tmpl">
                                <span className="text-xs font-medium text-ois-text">{tmpl}</span>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  className="h-6 px-2 text-[9px] font-bold uppercase py-0 opacity-0 group-hover/tmpl:opacity-100"
                                  onClick={() => navigate('/monitoring/rules')}
                                >
                                  Create rule
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex justify-center">
                  <Button
                    variant="primary"
                    className="h-11 px-8 font-bold gap-3 shadow-md bg-red-600 hover:bg-red-700 border-red-600"
                    onClick={() => setBulkOpen(true)}
                  >
                    <Plus size={20} /> Bulk create rules from suggestions
                  </Button>
                </div>
              </Card>
            </section>
          )}

          {/* Coverage Matrix */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-ois-text uppercase tracking-widest flex items-center gap-3">
                Coverage Matrix
                <span className="h-px bg-ois-border flex-1 w-32" />
              </h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ois-text-subtle" size={14} />
                  <input
                    placeholder="Search CIs..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="h-9 w-64 pl-9 pr-4 rounded-lg bg-white border border-ois-border text-xs font-medium focus:ring-2 focus:ring-ois-primary outline-none"
                  />
                </div>
                <div className="flex bg-white rounded-lg border border-ois-border p-1">
                  <button
                    onClick={() => setGroupBy('type')}
                    className={cn("px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all", groupBy === 'type' ? "bg-ois-primary text-white" : "text-ois-text-muted hover:bg-ois-bg")}
                  >
                    Type
                  </button>
                  <button
                    onClick={() => setGroupBy('service')}
                    className={cn("px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all", groupBy === 'service' ? "bg-ois-primary text-white" : "text-ois-text-muted hover:bg-ois-bg")}
                  >
                    Service
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-12">
              {Object.entries(groupedData).map(([groupKey, rows]: [string, CoverageRow[]]) => (
                <div key={groupKey} className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-ois-border">
                    <h4 className="text-xs font-bold text-ois-text uppercase tracking-widest flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-ois-primary" />
                      {groupBy === 'service' ? (mockServices.find(s => s.id === groupKey)?.name || 'Independent Resources') : groupKey.replace('_', ' ')}
                      <span className="text-ois-text-subtle ml-2">({rows.length})</span>
                    </h4>
                    <div className="text-[10px] font-bold text-ois-text-muted">
                      COVERAGE: {Math.round((rows.filter(r => r.rules.length > 0).length / rows.length) * 100)}%
                    </div>
                  </div>

                  <div className="divide-y divide-ois-border bg-white rounded-xl border border-ois-border shadow-sm overflow-hidden">
                    {rows.map(row => (
                      <div key={row.ci.id} className="group">
                        <div className="flex items-center gap-4 px-6 py-4 hover:bg-ois-bg transition-colors">
                          <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-ois-bg text-ois-text-subtle group-hover:bg-white transition-colors">
                            {getCIIcon(row.ci.type)}
                          </div>

                          <div className="w-48 shrink-0">
                            <p className="font-mono text-[9px] font-bold text-ois-text-subtle uppercase truncate">{row.ci.publicId}</p>
                            <h5 className="text-sm font-bold text-ois-text truncate">{row.ci.name}</h5>
                          </div>

                          <div className="w-32 shrink-0">
                            <Badge variant="neutral" className={cn("text-[9px] font-bold uppercase border", getCriticalityColor(row.ci.criticality))}>
                              {row.ci.criticality}
                            </Badge>
                          </div>

                          <div className="flex-1 flex items-center gap-4">
                            <div className={cn(
                              "flex items-center gap-2 text-xs font-bold",
                              row.rules.length > 0 ? "text-ois-success" : (row.ci.criticality === 'critical' || row.ci.criticality === 'high' ? "text-ois-danger" : "text-ois-warning")
                            )}>
                              {row.rules.length > 0 ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />}
                              {row.rules.length} {row.rules.length === 1 ? 'rule' : 'rules'}
                            </div>

                            <div className="flex-1 h-1.5 bg-ois-border rounded-full overflow-hidden max-w-[100px]">
                              <div className={cn("h-full", row.rules.length > 0 ? "bg-ois-success w-full" : "w-0")} />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            {row.rules.length > 0 ? (
                               <Button
                                onClick={() => setExpandedCIs(prev => ({ ...prev, [row.ci.id]: !prev[row.ci.id] }))}
                                variant="ghost" size="sm" className="h-8 px-3 font-bold text-[11px] gap-1.5"
                               >
                                 <Eye size={12} /> {expandedCIs[row.ci.id] ? 'Hide' : 'View'}
                               </Button>
                            ) : (
                               <Button
                                 variant="ghost"
                                 size="sm"
                                 className="h-8 px-3 font-bold text-[11px] gap-1.5 text-ois-primary"
                                 onClick={() => navigate('/monitoring/rules')}
                               >
                                 <Plus size={14} /> Add
                               </Button>
                            )}
                          </div>
                        </div>

                        {expandedCIs[row.ci.id] && row.rules.length > 0 && (
                          <div className="px-6 pb-6 pt-2 bg-ois-bg/50 animate-in slide-in-from-top-2 duration-300">
                             <div className="ml-12 space-y-2">
                               {row.rules.map(rule => (
                                 <div key={rule.id} className="flex items-center gap-4 p-3 bg-white rounded-lg border border-ois-border transition-all hover:border-ois-border-strong hover:shadow-sm">
                                    <span className="font-mono text-[9px] font-bold text-ois-text-subtle w-24 shrink-0">{rule.publicId}</span>
                                    <span className="text-xs font-semibold text-ois-text flex-1">{rule.name}</span>
                                    <Badge variant="neutral" className="text-[9px] font-bold uppercase h-5">
                                      {rule.severity}
                                    </Badge>
                                    <Button variant="ghost" className="h-7 w-7 p-0 text-ois-text-subtle hover:text-ois-primary">
                                       <ArrowRight size={14} />
                                    </Button>
                                 </div>
                               ))}
                             </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Sidebar - Sticky Analytics */}
        <aside className="w-80 space-y-6">
          <div className="sticky top-24 space-y-6">
            <Card className="p-6 space-y-6 bg-white border-ois-border shadow-sm">
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-ois-text uppercase tracking-widest flex items-center justify-between">
                  Coverage by criticality
                  <BarChart3 size={14} className="text-ois-text-subtle" />
                </h4>
                <div className="space-y-4">
                  {coverageByCriticality.map(stat => (
                    <div key={stat.label} className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className="text-ois-text-muted">{stat.label}</span>
                        <span className="text-ois-text">{stat.val}/{stat.total} ({Math.round((stat.val/stat.total)*100)}%)</span>
                      </div>
                      <div className="h-2 bg-ois-bg rounded-full overflow-hidden flex gap-0.5">
                        {Array.from({ length: 10 }).map((_, i) => (
                           <div
                            key={i}
                            className={cn(
                              "h-full flex-1 transition-all",
                              (i < (stat.val / stat.total) * 10) ? stat.color : "bg-ois-border/30"
                            )}
                           />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <hr className="border-ois-border" />

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-ois-text uppercase tracking-widest">Coverage by type</h4>
                <div className="space-y-3">
                  {coverageByType.map(stat => (
                    <div key={stat.label} className="flex items-center justify-between text-[11px] font-bold group">
                       <span className="text-ois-text-muted group-hover:text-ois-primary transition-colors cursor-default">{stat.label}</span>
                       <div className="flex items-center gap-3">
                         <span className="text-ois-text-subtle">{stat.val}/{stat.total}</span>
                         {stat.status === 'ok' && <ShieldCheck size={12} className="text-ois-success" />}
                         {stat.status === 'warn' && <AlertTriangle size={12} className="text-ois-warning" />}
                         {stat.status === 'critical' && <ShieldAlert size={12} className="text-ois-danger" />}
                         {stat.status === 'optional' && <Info size={12} className="text-ois-text-subtle" />}
                       </div>
                    </div>
                  ))}
                </div>
              </div>

              <hr className="border-ois-border" />

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-ois-text uppercase tracking-widest border-l-2 border-ois-primary pl-2">Insights</h4>
                <ul className="space-y-3">
                  {insightCriticalGaps > 0 && (
                    <li className="flex gap-2 text-xs font-medium text-ois-text leading-tight">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1 shrink-0" />
                      <span>{insightCriticalGaps} critical {insightCriticalGaps === 1 ? 'CI has' : 'CIs have'} no rules</span>
                    </li>
                  )}
                  {noisyRules.length > 0 && (
                    <li className="flex gap-2 text-xs font-medium text-ois-text-muted leading-tight">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1 shrink-0" />
                      <span>
                        {noisyRules.length} {noisyRules.length === 1 ? 'rule is' : 'rules are'} noisy (S/N &lt; 0.5):{' '}
                        {noisyRules.map((r, i) => (
                          <span key={r.id}>
                            <span className="text-ois-primary cursor-pointer hover:underline">{r.publicId}</span>
                            {i < noisyRules.length - 1 ? ', ' : ''}
                          </span>
                        ))}
                      </span>
                    </li>
                  )}
                  {silentRules.length > 0 && (
                    <li className="flex gap-2 text-xs font-medium text-ois-text-muted leading-tight">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1 shrink-0" />
                      <span>{silentRules.length} {silentRules.length === 1 ? 'rule' : 'rules'} never fired in 30d: may be obsolete</span>
                    </li>
                  )}
                  {insightCriticalGaps === 0 && noisyRules.length === 0 && silentRules.length === 0 && (
                    <li className="flex gap-2 text-xs font-medium text-ois-success leading-tight">
                      <ShieldCheck size={14} className="shrink-0" />
                      <span>All critical CIs are covered — no issues detected</span>
                    </li>
                  )}
                </ul>
              </div>
            </Card>

            <div className="p-6 rounded-2xl bg-gradient-to-br from-ois-primary to-blue-700 text-white space-y-4 shadow-lg overflow-hidden relative">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />
               <Zap className="text-white/40" size={32} />
               <h5 className="font-bold text-sm">Did you know?</h5>
               <p className="text-xs text-white/80 leading-relaxed font-medium">
                  Proactive monitoring coverage can reduce mean time to detect (MTTD) by up to 60%. Close your gaps before they become incidents.
               </p>
               <Button variant="ghost" className="w-full h-9 bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold uppercase border-none">
                  Enable Proactive Scan
               </Button>
            </div>
          </div>
        </aside>
      </div>
        </div>
      </div>

      <BulkCreateRulesModal
        isOpen={bulkOpen}
        onClose={() => setBulkOpen(false)}
        suggestions={criticalGaps.map(row => ({ ci: row.ci, templates: row.suggestedTemplates }))}
        onCreate={(rules) => {
          setCreatedRules(prev => [...rules, ...prev]);
          showToast(`Created ${rules.length} monitoring rule${rules.length === 1 ? '' : 's'}`);
        }}
      />
    </div>
  );
};
