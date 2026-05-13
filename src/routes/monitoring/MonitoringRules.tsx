import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, MoreVertical,
  Play, Pause, Settings, History,
  AlertCircle, Shield, Zap, Bell,
  Target, ArrowRight, BarChart3,
  Loader2, CheckCircle2, ChevronRight,
  ArrowLeft, Terminal, Database,
  Copy, RefreshCw, X, CircleDot,
  Radio, Layers, Info, Construction,
  Globe, AlertTriangle, ExternalLink,
  ChevronDown, ChevronUp, Trash2
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { DataTable, Column } from '../../components/ui/DataTable';
import { SeverityBadge } from '../../components/ui/StatusSeverityBadges';
import { SparkLine } from '../../components/charts/SparkLine';
import { 
  mockMonitoringRules, 
  mockCIs, 
  mockUsers, 
  mockAlertRoutes 
} from '../../mocks';
import { MonitoringRule, MonitoringRuleType, EventSource } from '../../types/monitoring';
import { Can, useCan } from '@/src/lib/rbac';
import { Severity } from '../../types/common';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { cn } from '../../lib/utils';
import { RuleStatusToggle } from '../../components/monitoring/RuleStatusToggle';
import { RuleSparkline } from '../../components/monitoring/RuleSparkline';
import { RuleQueryDisplay } from '../../components/monitoring/RuleQueryDisplay';
import { ruleTypeMeta } from '../../lib/constants';
import { StepperNav } from '../../components/monitoring/RuleWizard/StepperNav';
import { FilterDropdown } from '../../components/ui/FilterDropdown';
import { Step1Define } from '../../components/monitoring/RuleWizard/Step1Define';
import { Step2Conditions } from '../../components/monitoring/RuleWizard/Step2Conditions';
import { Step3Routing } from '../../components/monitoring/RuleWizard/Step3Routing';

// --- Types ---
type WizardStep = 1 | 2 | 3;

interface RuleFormData {
  name: string;
  description: string;
  source: EventSource;
  type: MonitoringRuleType;
  query: string;
  severity: Severity;
  threshold: number;
  operator: string;
  duration: string;
  cooldown: string;
  targetMode: 'explicit' | 'selector';
  targetCIIds: string[];
  targetSelector: {
    types?: string[];
    services?: string[];
    environments?: string[];
    tags?: string[];
  };
  tags: string[];
  alertRouteId: string;
}

// --- Helpers ---
const generateSparklineData = () => Array.from({ length: 12 }, () => Math.floor(Math.random() * 10));

export const MonitoringRules: React.FC = () => {
  const navigate = useNavigate();
  const canManage = useCan('monitoring', 'update');

  // --- State ---
  const [rules, setRules] = useState<MonitoringRule[]>(mockMonitoringRules);
  const [deleteConfirmRule, setDeleteConfirmRule] = useState<MonitoringRule | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<MonitoringRuleType | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all');
  const [enabledFilter, setEnabledFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  const [testModalRule, setTestModalRule] = useState<MonitoringRule | null>(null);
  const [testedChannels, setTestedChannels] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState<RuleFormData>({
    name: '',
    description: '',
    source: 'prometheus',
    type: 'threshold',
    query: '',
    severity: 'P2',
    threshold: 0.01,
    operator: '>',
    duration: '5 minutes',
    cooldown: '10 minutes',
    targetMode: 'explicit',
    targetCIIds: [],
    targetSelector: {},
    tags: ['production'],
    alertRouteId: 'ar-001'
  });

  // --- Derived Calculations ---
  const filteredRules = useMemo(() => {
    return rules.filter(rule => {
      const matchesSearch = rule.name.toLowerCase().includes(search.toLowerCase()) ||
                            rule.publicId.toLowerCase().includes(search.toLowerCase()) ||
                            rule.query.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === 'all' || rule.type === typeFilter;
      const matchesSeverity = severityFilter === 'all' || rule.severity === severityFilter;
      const matchesEnabled = enabledFilter === 'all' || 
                             (enabledFilter === 'enabled' ? rule.enabled : !rule.enabled);
      return matchesSearch && matchesType && matchesSeverity && matchesEnabled;
    });
  }, [rules, search, typeFilter, severityFilter, enabledFilter]);

  const stats = useMemo(() => {
    const totalCount = rules.length;
    const enabledCount = rules.filter(r => r.enabled).length;
    const disabledCount = totalCount - enabledCount;
    const avgSNR = rules.reduce((acc, r) => acc + (r.signalToNoiseRatio || 0), 0) / (totalCount || 1);
    const typeCounts = rules.reduce((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { totalCount, enabledCount, disabledCount, avgSNR, typeCounts };
  }, [rules]);

  // Memoize sparkline data so it doesn't regenerate on every render
  const sparklineData = useMemo(() => {
    return Object.fromEntries(rules.map(r => [r.id, generateSparklineData()]));
  }, [rules]);

  // --- Derived stats strip values ---
  const statsStrip = useMemo(() => {
    const total = rules.length;
    const avgFires = total > 0
      ? Math.round(rules.reduce((acc, r) => acc + r.totalFires30d, 0) / total)
      : 0;
    const noisy = rules.filter(r => (r.signalToNoiseRatio || 0) < 0.5).length;
    const neverFired = rules.filter(r => r.totalFires30d === 0).length;
    return { avgFires, noisy, neverFired };
  }, [rules]);

  // --- Handlers ---
  const handleToggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const handleOpenWizard = (rule?: MonitoringRule) => {
    if (rule) {
      setIsEditMode(true);
      setEditingRuleId(rule.id);
      setFormData({
        name: rule.name,
        description: rule.description || '',
        source: rule.source,
        type: rule.type,
        query: rule.query,
        severity: rule.severity,
        threshold: rule.condition?.threshold || 0,
        operator: rule.condition?.operator || '>',
        duration: rule.condition?.duration || '5m',
        cooldown: rule.cooldown || '10m',
        targetMode: rule.targetMode,
        targetCIIds: rule.targetCIIds || [],
        targetSelector: rule.targetSelector || {},
        tags: rule.tags || [],
        alertRouteId: rule.alertRouteId
      });
    } else {
      setIsEditMode(false);
      setEditingRuleId(null);
      setFormData({
        name: '',
        description: '',
        source: 'prometheus',
        type: 'threshold',
        query: '',
        severity: 'P2',
        threshold: 0.01,
        operator: '>',
        duration: '5 minutes',
        cooldown: '10 minutes',
        targetMode: 'explicit',
        targetCIIds: [],
        targetSelector: {},
        tags: ['production'],
        alertRouteId: 'ar-001'
      });
    }
    setCurrentStep(1);
    setIsWizardOpen(true);
  };

  const handleCreateOrUpdateRule = () => {
    if (isEditMode && editingRuleId) {
      setRules(prev => prev.map(r => r.id === editingRuleId ? {
        ...r,
        name: formData.name,
        description: formData.description,
        source: formData.source,
        type: formData.type,
        query: formData.query,
        severity: formData.severity,
        enabled: r.enabled, // Keep current status
        alertRouteId: formData.alertRouteId,
        alertRoutePublicId: mockAlertRoutes.find(ar => ar.id === formData.alertRouteId)?.publicId || 'UNKNOWN',
        targetCount: formData.targetCIIds.length,
        updatedAt: new Date().toISOString()
      } : r));
    } else {
      const newRule: MonitoringRule = {
        id: `rule-${Date.now()}`,
        publicId: `RULE-${Math.random().toString(36).substring(2, 5).toUpperCase()}-${Math.floor(Math.random() * 999).toString().padStart(3, '0')}`,
        name: formData.name,
        description: formData.description,
        source: formData.source,
        type: formData.type,
        query: formData.query,
        enabled: true,
        targetMode: formData.targetMode,
        targetCIIds: formData.targetCIIds,
        targetCount: formData.targetCIIds.length,
        condition: {
          threshold: formData.threshold,
          operator: formData.operator as any,
          duration: formData.duration
        },
        severity: formData.severity,
        cooldown: formData.cooldown,
        alertRouteId: formData.alertRouteId,
        alertRoutePublicId: mockAlertRoutes.find(ar => ar.id === formData.alertRouteId)?.publicId || 'UNKNOWN',
        lastTriggeredAt: null,
        totalFires30d: 0,
        signalToNoiseRatio: 1.0,
        createdBy: 'u-001',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: formData.tags
      };
      setRules([newRule, ...rules]);
    }
    setIsWizardOpen(false);
  };

  const handleDeleteRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
    setDeleteConfirmRule(null);
  };

  // --- Table Columns ---
  const columns: Column<MonitoringRule>[] = [
    {
      header: '☐',
      accessor: (rule) => (
        <input 
          type="checkbox" 
          checked={selectedRows.includes(rule.id)}
          onChange={(e) => {
            if (e.target.checked) setSelectedRows([...selectedRows, rule.id]);
            else setSelectedRows(selectedRows.filter(rid => rid !== rule.id));
          }}
          className="rounded border-ois-border-strong text-ois-primary focus:ring-ois-primary"
        />
      ),
      className: 'w-10'
    },
    {
      header: 'Status',
      accessor: (rule) => (
        <RuleStatusToggle 
          enabled={rule.enabled} 
          onToggle={() => handleToggleRule(rule.id)} 
        />
      ),
      className: 'w-20'
    },
    {
       header: 'Public ID',
       accessor: (rule) => <span className="font-mono text-[10px] font-bold text-ois-text-subtle uppercase">{rule.publicId}</span>,
       className: 'w-32'
    },
    {
       header: 'Name',
       accessor: (rule) => (
         <div title={rule.query}>
            <p className="text-sm font-semibold text-ois-text truncate max-w-[240px]">{rule.name}</p>
         </div>
       ),
    },
    {
       header: 'Type',
       accessor: (rule) => {
         const meta = ruleTypeMeta[rule.type];
         return (
           <Badge variant="neutral" className="bg-ois-surface-muted text-ois-text-muted border-ois-border text-[10px] font-bold uppercase gap-1.5 px-2">
             {meta.icon && <meta.icon size={10} />}
             {meta.label}
           </Badge>
         );
       },
    },
    {
       header: 'Severity',
       accessor: (rule) => <SeverityBadge severity={rule.severity} />,
       className: 'w-24'
    },
    {
       header: 'Targets',
       accessor: (rule) => (
         <div className="group relative">
           <Badge variant="neutral" className="bg-ois-bg border-ois-border text-ois-text-muted hover:bg-ois-surface-muted transition-colors cursor-help">
             {rule.targetCount} {rule.targetCount === 1 ? 'CI' : 'CIs'}
           </Badge>
           {/* Tooltip implementation would go here */}
         </div>
       ),
    },
    {
       header: 'Last Fired',
       accessor: (rule) => (
         <span className="text-[11px] font-medium text-ois-text-muted whitespace-nowrap">
           {rule.lastTriggeredAt ? `${formatDistanceToNow(parseISO(rule.lastTriggeredAt))} ago` : 'Never'}
         </span>
       ),
    },
    {
       header: 'Fires (30d)',
       accessor: (rule) => (
         <div className="flex items-center gap-3">
           <span className="text-xs font-bold text-ois-text w-6">{rule.totalFires30d}</span>
           <RuleSparkline data={sparklineData[rule.id] || []} color={rule.totalFires30d > 50 ? '#F04438' : '#1F4FD4'} />
         </div>
       ),
    },
    {
       header: 'S/N',
       accessor: (rule) => (
         <span className={cn(
           "text-xs font-bold",
           (rule.signalToNoiseRatio || 0) >= 0.8 ? "text-ois-success" : 
           (rule.signalToNoiseRatio || 0) >= 0.5 ? "text-ois-warning" : "text-ois-danger"
         )}>
           {Math.round((rule.signalToNoiseRatio || 0) * 100)}%
         </span>
       ),
    },
    {
       header: 'Route',
       accessor: (rule) => (
         <button
           className="text-[11px] font-bold text-ois-primary hover:underline whitespace-nowrap"
           onClick={(e) => { e.stopPropagation(); navigate('/monitoring/routing'); }}
         >
           {rule.alertRoutePublicId}
         </button>
       ),
    },
    {
       header: 'Actions',
       accessor: (rule) => (
         canManage ? (
           <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={(e) => { e.stopPropagation(); handleOpenWizard(rule); }}
              >
                 <Settings size={14} className="text-ois-text-muted" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={(e) => { e.stopPropagation(); setTestModalRule(rule); }}
              >
                 <Play size={14} className="text-ois-text-muted" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={(e) => { e.stopPropagation(); setDeleteConfirmRule(rule); }}
              >
                 <Trash2 size={14} className="text-ois-danger" />
              </Button>
           </div>
         ) : (
           <span className="text-[10px] text-ois-text-subtle italic">read-only</span>
         )
       ),
       className: 'w-28'
    }
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0">

      {/* ── Action row ── */}
      <div className="shrink-0 flex items-center justify-end px-6 py-2.5 border-b border-ois-border bg-ois-surface">
        <Can module="monitoring" action="update">
          <Button variant="primary" size="sm" className="gap-1.5" onClick={() => handleOpenWizard()}>
            <Plus size={13} /> New rule
          </Button>
        </Can>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-5 space-y-5 pb-20">

      {/* Filter Bar */}
      <Card className="p-4 border-ois-border bg-white/50 backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ois-text-subtle" size={18} />
            <Input 
              placeholder="Search name, query, target..." 
              className="pl-10 h-11 border-ois-border-strong bg-white focus:ring-2 focus:ring-ois-primary/10 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
             <FilterDropdown
               value={typeFilter}
               onChange={(v) => setTypeFilter(v as MonitoringRuleType | 'all')}
               options={[
                 { value: 'all', label: 'All Types' },
                 { value: 'threshold', label: 'Threshold' },
                 { value: 'anomaly', label: 'Anomaly' },
                 { value: 'log_pattern', label: 'Log Pattern' },
                 { value: 'synthetic', label: 'Synthetic' },
                 { value: 'absence', label: 'Absence' },
               ]}
               placeholder="All Types"
             />
             <FilterDropdown
               value={severityFilter}
               onChange={(v) => setSeverityFilter(v as Severity | 'all')}
               options={[
                 { value: 'all', label: 'All Severities' },
                 { value: 'P1', label: 'P1 — Critical' },
                 { value: 'P2', label: 'P2 — High' },
                 { value: 'P3', label: 'P3 — Medium' },
                 { value: 'P4', label: 'P4 — Low' },
               ]}
               placeholder="All Severities"
             />
             <FilterDropdown
               value={enabledFilter}
               onChange={(v) => setEnabledFilter(v as 'all' | 'enabled' | 'disabled')}
               options={[
                 { value: 'all', label: 'Any Status' },
                 { value: 'enabled', label: 'Enabled only' },
                 { value: 'disabled', label: 'Disabled only' },
               ]}
               placeholder="Any Status"
             />
             <Button 
               variant="ghost" 
               size="sm" 
               className="h-10 text-ois-text-subtle hover:text-ois-primary font-bold px-4"
               onClick={() => {
                 setSearch('');
                 setTypeFilter('all');
                 setSeverityFilter('all');
                 setEnabledFilter('all');
               }}
              >
               Reset
             </Button>
          </div>
        </div>
      </Card>

      {/* Stats Strip */}
      <div className="flex flex-wrap items-center gap-3">
         <Badge 
           variant="neutral" 
           onClick={() => setTypeFilter('all')}
           className={cn(
             "h-8 px-4 font-bold text-xs cursor-pointer transition-all",
             typeFilter === 'all' ? "bg-ois-primary text-white border-ois-primary" : "bg-white text-ois-text-muted border-ois-border hover:bg-ois-bg"
           )}
          >
           All {stats.totalCount}
         </Badge>
         {Object.entries(stats.typeCounts).map(([type, count]) => (
           <Badge 
             key={type}
             variant="neutral" 
             onClick={() => setTypeFilter(type as MonitoringRuleType)}
             className={cn(
               "h-8 px-4 font-bold text-xs cursor-pointer transition-all capitalize",
               typeFilter === type ? "bg-ois-primary text-white border-ois-primary" : "bg-white text-ois-text-muted border-ois-border hover:bg-ois-bg"
             )}
            >
             {type.replace('_', ' ')} {count}
           </Badge>
         ))}
         <div className="flex items-center gap-4 ml-auto px-4 py-1.5 bg-ois-bg rounded-lg border border-ois-border">
            <span className="text-[11px] font-bold text-ois-text-muted uppercase tracking-widest">Avg fires (30d): {statsStrip.avgFires}</span>
            <span className="w-px h-3 bg-ois-border" />
            <span className="text-[11px] font-bold text-ois-danger uppercase tracking-widest">Noisy: {statsStrip.noisy}</span>
            <span className="w-px h-3 bg-ois-border" />
            <span className="text-[11px] font-bold text-ois-text-subtle uppercase tracking-widest">Never fired: {statsStrip.neverFired}</span>
         </div>
      </div>

      {/* Table Section */}
      <Card className="border-ois-border overflow-hidden bg-white shadow-sm">
        <DataTable 
          columns={columns} 
          data={filteredRules}
          onRowClick={(rule) => handleOpenWizard(rule)}
        />
        
        {filteredRules.length === 0 && (
          <div className="py-24 flex flex-col items-center text-center px-6">
            <Radio size={48} className="text-ois-text-subtle mb-4" />
            <h3 className="text-lg font-bold text-ois-text mb-2">No monitoring rules found</h3>
            <p className="text-sm text-ois-text-muted max-w-sm mb-6">
              {search || typeFilter !== 'all' || severityFilter !== 'all' || enabledFilter !== 'all' 
                ? "Your filters didn't return any results. Try broadening your criteria or reset the filters."
                : "Get started by creating your first monitoring rule to observe your infrastructure health."}
            </p>
            {search || typeFilter !== 'all' || severityFilter !== 'all' || enabledFilter !== 'all' ? (
              <Button 
                variant="outline" 
                className="h-10 border-ois-border-strong font-bold"
                onClick={() => {
                   setSearch('');
                   setTypeFilter('all');
                   setSeverityFilter('all');
                   setEnabledFilter('all');
                }}
              >
                Reset all filters
              </Button>
            ) : (
              <Button variant="primary" className="h-10 px-6 font-bold gap-2" onClick={() => handleOpenWizard()}>
                <Plus size={18} /> Create first rule
              </Button>
            )}
          </div>
        )}
      </Card>

        </div>
      </div>

      {/* Create/Edit Wizard Modal */}
      <Modal 
        isOpen={isWizardOpen} 
        onClose={() => setIsWizardOpen(false)}
        title={isEditMode ? `Edit rule: ${formData.name}` : "Create Monitoring Rule"}
        size="lg"
      >
        <StepperNav 
          currentStep={currentStep} 
          steps={[
            { title: 'Define', subtitle: 'Basic info' },
            { title: 'Conditions', subtitle: 'Thresholds' },
            { title: 'Routing', subtitle: 'Alert routes' }
          ]} 
        />
        
        <div className="p-8">
          <div className="max-w-4xl mx-auto">
            {currentStep === 1 && (
              <Step1Define 
                data={formData} 
                updateData={(newData) => setFormData(prev => ({ ...prev, ...newData }))} 
              />
            )}
            {currentStep === 2 && (
              <Step2Conditions 
                data={{...formData, targets: formData.targetCIIds}} 
                updateData={(newData) => setFormData(prev => ({ 
                  ...prev, 
                  ...newData, 
                  targetCIIds: newData.targets || prev.targetCIIds 
                }))} 
              />
            )}
            {currentStep === 3 && (
              <Step3Routing 
                data={{...formData, routingPublicId: formData.alertRouteId, targets: formData.targetCIIds}} 
                updateData={(newData) => setFormData(prev => ({ 
                  ...prev, 
                  ...newData, 
                  alertRouteId: newData.routingPublicId || prev.alertRouteId 
                }))} 
              />
            )}
          </div>
        </div>

        {/* Wizard Footer */}
        <div className="mt-8 flex items-center justify-between pt-6 border-t border-ois-border">
           <Button 
             variant="ghost" 
             className="h-10 px-6 font-bold text-ois-text-muted"
             onClick={() => {
               if (currentStep === 1) setIsWizardOpen(false);
               else setCurrentStep((currentStep - 1) as WizardStep);
             }}
           >
              {currentStep === 1 ? 'Cancel' : '← Back'}
           </Button>
           <div className="flex items-center gap-3">
              {currentStep === 3 && (
                <Button 
                  variant="outline" 
                  className="h-10 px-6 font-bold border-ois-border-strong bg-white hover:bg-ois-bg"
                  onClick={handleCreateOrUpdateRule}
                >
                   Save as draft
                </Button>
              )}
              {currentStep < 3 ? (
                <Button 
                  variant="primary" 
                  className="h-10 px-8 font-bold gap-2"
                  onClick={() => setCurrentStep((currentStep + 1) as WizardStep)}
                >
                   Next: {currentStep === 1 ? 'Set thresholds' : 'Configure routing'} <ArrowRight size={18} />
                </Button>
              ) : (
                <Button 
                  variant="primary" 
                  className="h-10 px-8 font-bold gap-2"
                  onClick={handleCreateOrUpdateRule}
                >
                   {isEditMode ? 'Save changes' : 'Create rule'} <CheckCircle2 size={18} />
                </Button>
              )}
           </div>
        </div>
      </Modal>

      {/* Rule Test Modal */}
      {(() => {
        const testRoute = testModalRule
          ? mockAlertRoutes.find(ar => ar.id === testModalRule.alertRouteId) ?? null
          : null;
        const channelIconMap: Record<string, React.ElementType> = {
          sms: Bell,
          email: Bell,
          slack: Zap,
          teams: Zap,
          webhook: Globe,
          in_app: Bell,
        };
        return (
          <Modal
            isOpen={!!testModalRule}
            onClose={() => { setTestModalRule(null); setTestedChannels(new Set()); }}
            title={`Test rule: ${testModalRule?.publicId}`}
            size="md"
          >
            <div className="space-y-6 py-4">
               <div className="p-4 bg-ois-warning-pale border border-ois-warning/20 rounded-xl">
                  <p className="text-xs text-ois-warning flex items-start gap-2 leading-tight">
                     <Info size={16} className="shrink-0" />
                     This will simulate a test event payload using current live data and trigger a simulated routing dry-run. No real SMS or Phone calls will be made, but Slack webhook tests will fire if enabled.
                  </p>
               </div>

               <div className="space-y-4">
                  <h4 className="text-xs font-bold text-ois-text uppercase tracking-widest leading-none mb-4">Channel preview</h4>
                  {testRoute ? (
                    <div className="divide-y divide-ois-border border border-ois-border rounded-xl overflow-hidden">
                       {testRoute.channels.map((channel, i) => {
                         const Icon = channelIconMap[channel] ?? Bell;
                         const recipientNames = testRoute.recipients.map(r => r.targetName).join(', ');
                         const channelId = `${channel}-${i}`;
                         return (
                           <div key={i} className="flex items-center justify-between p-4 bg-white">
                              <div className="flex items-center gap-3">
                                 <div className="p-2 bg-ois-bg rounded-lg">
                                    <Icon size={16} className="text-ois-text-muted" />
                                 </div>
                                 <div>
                                    <p className="text-xs font-bold text-ois-text capitalize">{channel.replace('_', ' ')}</p>
                                    <p className="text-[10px] text-ois-text-muted">{recipientNames || '—'}</p>
                                 </div>
                              </div>
                              {testedChannels.has(channelId) ? (
                                <span className="flex items-center gap-1 text-xs font-medium text-ois-success">
                                  <CheckCircle2 size={12} /> Sent
                                </span>
                              ) : (
                                <button
                                  onClick={() => setTestedChannels(prev => new Set([...prev, channelId]))}
                                  className="text-xs font-medium text-ois-primary hover:underline"
                                >
                                  Test
                                </button>
                              )}
                           </div>
                         );
                       })}
                    </div>
                  ) : (
                    <div className="p-4 border border-ois-border rounded-xl text-sm text-ois-text-muted text-center">
                      No route configured for this rule.
                    </div>
                  )}
               </div>

               <div className="flex items-center justify-between pt-6 border-t border-ois-border">
                  <span className="text-[10px] font-bold text-ois-text-subtle uppercase">Last test: Never</span>
                  <div className="flex items-center gap-3">
                     <Button variant="ghost" className="h-10 font-bold text-ois-text-muted" onClick={() => { setTestModalRule(null); setTestedChannels(new Set()); }}>
                        Close
                     </Button>
                     <Button
                        variant="primary"
                        className="h-10 px-8 font-bold gap-2"
                        onClick={() => {
                          if (testRoute) {
                            const allIds = testRoute.channels.map((c, i) => `${c}-${i}`);
                            setTestedChannels(new Set(allIds));
                          }
                        }}
                     >
                        <Play size={16} /> Run all
                     </Button>
                  </div>
               </div>
            </div>
          </Modal>
        );
      })()}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmRule}
        onClose={() => setDeleteConfirmRule(null)}
        title="Delete monitoring rule"
        size="sm"
      >
        <div className="space-y-6 py-4">
          <p className="text-sm text-ois-text">
            Are you sure you want to delete{' '}
            <span className="font-bold">{deleteConfirmRule?.name}</span>?
            This action cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              className="h-10 px-6 font-bold text-ois-text-muted"
              onClick={() => setDeleteConfirmRule(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="h-10 px-6 font-bold"
              onClick={() => deleteConfirmRule && handleDeleteRule(deleteConfirmRule.id)}
            >
              Delete rule
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

