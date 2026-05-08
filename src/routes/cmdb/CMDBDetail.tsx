import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Edit2, MoreHorizontal, Globe, 
  ExternalLink, FileJson, Zap, BookOpen, Bug, 
  Clock, Activity, ShieldCheck, AlertCircle, Heart, Radio
} from 'lucide-react';
import { 
  mockCIs, 
  mockCIRelationships, 
  mockServices, 
  mockCIAuditEntries,
  mockMonitoringRules
} from '@/src/mocks';
import { MonitoringRule } from '../../types/monitoring';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Tabs } from '../../components/ui/Tabs';
import { StatusBadge } from '../../components/ui/StatusSeverityBadges';
import { DataTable } from '../../components/ui/DataTable';
import { SparkLine } from '../../components/charts/SparkLine';
import { cn } from '@/src/lib/utils';
import { CIQuickFactsCard } from '../../components/cmdb/CIQuickFactsCard';
import { CIAuditTimeline } from '../../components/cmdb/CIAuditTimeline';
import { CITypeIcon } from '../../components/cmdb/CITypeIcon';
import { CIRelationshipBadge } from '../../components/cmdb/CIRelationshipBadge';
import { CIStatusBadge } from '../../components/cmdb/CIStatusBadge';

export const CMDBDetail: React.FC = () => {
  const { ciId } = useParams<{ ciId: string }>();
  const navigate = useNavigate();
  const [showJson, setShowJson] = useState(false);

  const ci = useMemo(() => mockCIs.find(c => c.id === ciId || c.publicId === ciId), [ciId]);
  const service = useMemo(() => mockServices.find(s => s.id === ci?.serviceId), [ci]);

  if (!ci) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-xl font-bold text-ois-text">CI Not Found</h2>
        <Button onClick={() => navigate('/cmdb')} variant="primary" className="mt-4">Back to CMDB</Button>
      </div>
    );
  }

  const outgoing = mockCIRelationships.filter(r => r.fromCiId === ci.id);
  const incoming = mockCIRelationships.filter(r => r.toCiId === ci.id);

  const ciRules = useMemo(() => mockMonitoringRules.filter(r => r.targetCIIds.includes(ci.id)), [ci.id]);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/cmdb')} className="flex items-center gap-2 text-sm font-bold text-ois-text-muted hover:text-ois-primary">
          <ArrowLeft size={16} /> Back to CMDB
        </button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2 h-9 bg-white border-ois-border-strong">
            <Edit2 size={14} /> Edit
          </Button>
          <Button variant="outline" size="sm" className="h-9 w-9 p-0 bg-white border-ois-border-strong">
            <MoreHorizontal size={18} />
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex items-start gap-4">
          <CITypeIcon type={ci.type} size={28} className="w-14 h-14 rounded-xl" />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono font-bold text-xs bg-ois-surface-muted px-1.5 py-0.5 rounded text-ois-text-subtle">{ci.publicId}</span>
              <CIStatusBadge status={ci.status} />
            </div>
            <h1 className="text-2xl font-bold text-ois-text leading-tight">{ci.name}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ois-text-muted font-medium">
              <span className="flex items-center gap-1"><Globe size={14} /> {service?.name || 'Unassigned'}</span>
              <span>•</span>
              <span className="capitalize">{ci.environment}</span>
              <span>•</span>
              <span className="capitalize">Tier {ci.criticality === 'critical' ? '1' : '2'}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
           <Badge variant="neutral" className="gap-2 px-3 py-1.5 h-auto font-bold bg-white border-ois-border-strong"><Heart size={14} className="text-ois-success" /> Operational</Badge>
           <Badge variant="neutral" className="gap-2 px-3 py-1.5 h-auto font-bold bg-white border-ois-border-strong"><Radio size={14} className="text-ois-primary" /> {ci.monitoringRuleCount} Rules</Badge>
           <Badge variant="neutral" className="gap-2 px-3 py-1.5 h-auto font-bold bg-white border-ois-border-strong"><AlertCircle size={14} className={ci.openIncidentCount > 0 ? "text-ois-danger" : "text-ois-success"} /> {ci.openIncidentCount} Incidents</Badge>
        </div>
      </div>

      <Tabs tabs={[
        { id: 'overview', label: 'Overview' },
        { id: 'relationships', label: `Relationships (${outgoing.length + incoming.length})` },
        { id: 'attributes', label: 'Attributes' },
        { id: 'linked', label: 'Linked Items' },
        { id: 'history', label: 'History' },
        { id: 'monitoring', label: 'Monitoring' },
      ]}>
        <div id="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-6">
              <CIQuickFactsCard ci={ci} />
              <Card>
                <div className="p-4 border-b border-ois-border bg-ois-surface-muted/20">
                  <h3 className="text-sm font-bold text-ois-text uppercase tracking-wider opacity-60">Specifications</h3>
                </div>
                <div className="p-4 grid grid-cols-2 gap-y-4 gap-x-8">
                  {Object.entries(ci.attributes).filter(([k]) => k !== 'kind').map(([k, v]) => (
                    <div key={k} className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-ois-text-subtle uppercase">{k.replace(/([A-Z])/g, ' $1')}</span>
                      {k === 'repoUrl' ? (
                        <a href="#" className="text-sm font-semibold text-ois-primary flex items-center gap-1.5">{String(v)} <ExternalLink size={14} /></a>
                      ) : <span className="text-sm font-semibold text-ois-text">{String(v)}</span>}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
            <div className="lg:col-span-4 space-y-6">
              <Card>
                <div className="p-4 border-b border-ois-border bg-ois-surface-muted/20 flex justify-between items-center">
                  <h3 className="text-sm font-bold text-ois-text uppercase tracking-wider opacity-60">Activity</h3>
                  <button onClick={() => {}} className="text-[10px] font-bold text-ois-primary uppercase hover:underline">View All</button>
                </div>
                <div className="p-4 scale-95 origin-top">
                  <CIAuditTimeline entries={mockCIAuditEntries.filter(e => e.ciId === ci.id).slice(0, 5)} showCIInfo={false} />
                </div>
              </Card>
              <Card>
                <div className="p-4 border-b border-ois-border bg-ois-surface-muted/20">
                   <h3 className="text-sm font-bold text-ois-text uppercase tracking-wider opacity-60">Health Snapshot</h3>
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex justify-between text-[11px] font-bold uppercase"><span className="text-ois-text-muted">Last 24 hours</span><span className="text-ois-success">100% Operational</span></div>
                  <div className="h-10 w-full bg-ois-success-pale/30 rounded flex items-center px-2">
                     <SparkLine data={[100, 100, 95, 100, 100, 100, 100]} className="w-full h-8 text-ois-success" />
                  </div>
                  <div className="text-[10px] font-bold text-ois-text-subtle text-right uppercase tracking-tighter">99.98% Composite Uptime</div>
                </div>
              </Card>
            </div>
          </div>
        </div>

        <div id="relationships" className="space-y-6">
           <Card>
             <div className="p-4 border-b border-ois-border bg-ois-surface-muted/20 font-bold text-sm">Active Tree Connections</div>
             <div className="divide-y divide-ois-border">
               {outgoing.map(rel => {
                 const target = mockCIs.find(c => c.id === rel.toCiId);
                 return (
                   <div key={rel.id} className="p-4 flex items-center justify-between hover:bg-ois-bg/50 cursor-pointer" onClick={() => navigate(`/cmdb/${target?.id}`)}>
                     <div className="flex items-center gap-8">
                       <CIRelationshipBadge type={rel.type} />
                       <div className="flex items-center gap-3">
                         <CITypeIcon type={target?.type || 'server'} size={12} />
                         <div className="flex flex-col">
                           <span className="text-[10px] font-mono font-bold text-ois-text-subtle leading-none mb-0.5">{target?.publicId}</span>
                           <span className="text-sm font-semibold text-ois-text">{target?.name}</span>
                         </div>
                       </div>
                     </div>
                     <StatusBadge status={target?.health || 'unknown'} />
                   </div>
                 );
               })}
               {incoming.map(rel => {
                 const source = mockCIs.find(c => c.id === rel.fromCiId);
                 return (
                   <div key={rel.id} className="p-4 flex items-center justify-between hover:bg-ois-bg/50 cursor-pointer" onClick={() => navigate(`/cmdb/${source?.id}`)}>
                     <div className="flex items-center gap-8">
                       <CIRelationshipBadge type={rel.type} isIncoming />
                       <div className="flex items-center gap-3">
                         <CITypeIcon type={source?.type || 'server'} size={12} />
                         <div className="flex flex-col">
                           <span className="text-[10px] font-mono font-bold text-ois-text-subtle leading-none mb-0.5">{source?.publicId}</span>
                           <span className="text-sm font-semibold text-ois-text">{source?.name}</span>
                         </div>
                       </div>
                     </div>
                     <StatusBadge status={source?.health || 'unknown'} />
                   </div>
                 );
               })}
             </div>
           </Card>
           <div className="flex justify-center"><Button variant="outline" className="gap-2 text-ois-primary border-ois-primary/30" onClick={() => navigate(`/cmdb/graph?focus=${ci.id}`)}>Open in Graph View →</Button></div>
        </div>

        <div id="attributes" className="space-y-6">
          <Card>
            <div className="p-4 border-b border-ois-border font-bold text-sm bg-ois-surface-muted/20">Full Attribute Registry</div>
            <div className="grid grid-cols-2 divide-x divide-y divide-ois-border">
               {Object.entries(ci.attributes).map(([k, v]) => (
                 <div key={k} className="p-4 flex flex-col gap-1">
                   <span className="text-[10px] font-bold text-ois-text-subtle uppercase">{k}</span>
                   <span className="text-sm font-mono font-medium text-ois-text break-all">{String(v)}</span>
                 </div>
               ))}
            </div>
          </Card>
          <div className="p-4 flex justify-between items-center bg-white border border-ois-border rounded-xl">
             <span className="text-sm font-bold text-ois-text flex items-center gap-2"><FileJson size={16} /> Raw Resource Data (JSON)</span>
             <Button variant="outline" size="sm" onClick={() => setShowJson(!showJson)}>{showJson ? 'Hide' : 'Expand'}</Button>
          </div>
          {showJson && <div className="bg-gray-900 rounded-xl p-6 overflow-x-auto"><pre className="text-[11px] text-blue-300 leading-relaxed font-mono">{JSON.stringify(ci, null, 2)}</pre></div>}
        </div>

        <div id="linked" className="grid grid-cols-2 gap-6">
            <Card>
              <div className="p-3 border-b border-ois-border flex justify-between items-center font-bold text-xs uppercase tracking-wider opacity-60">
                 Linked Problems <Bug size={14} className="text-ois-warning" />
              </div>
              <div className="p-8 text-center text-xs text-ois-text-muted italic">No linked problems</div>
            </Card>
            <Card>
                <div className="p-3 border-b border-ois-border flex justify-between items-center font-bold text-xs uppercase tracking-wider opacity-60">
                    Linked KB <BookOpen size={14} className="text-ois-primary" />
                </div>
                <div className="p-8 text-center text-xs text-ois-text-muted italic">No linked KB articles</div>
            </Card>
            <Card className="col-span-2">
                <div className="p-3 border-b border-ois-border flex justify-between items-center font-bold text-xs uppercase tracking-wider opacity-60">
                    Linked Changes <ShieldCheck size={14} className="text-ois-info" />
                </div>
                <div className="p-8 text-center text-xs text-ois-text-muted italic">No recent changes linked</div>
            </Card>
        </div>

        <div id="history">
            <div className="max-w-3xl mx-auto py-4">
              <CIAuditTimeline entries={mockCIAuditEntries.filter(e => e.ciId === ci.id)} showCIInfo={false} />
            </div>
        </div>

        <div id="monitoring" className="space-y-4">
           <Card className="overflow-hidden">
             <DataTable columns={[
               { 
                 header: 'Rule Name', 
                 accessor: (r: any) => (
                   <button 
                     onClick={() => navigate(`/monitoring/rules?focus=${r.publicId}`)}
                     className="font-semibold text-sm text-ois-primary hover:underline text-left"
                   >
                     {r.name}
                   </button>
                 ) 
               },
               { header: 'Type', accessor: (r: any) => <Badge variant="neutral" className="capitalize text-[10px]">{r.type}</Badge> },
               { header: 'Severity', accessor: (r: any) => <Badge variant={r.severity === 'P1' ? 'danger' : 'warning'} className="text-[10px] font-bold">{r.severity}</Badge> },
               { header: 'Last Triggered', accessor: (r: any) => <span className="text-xs text-ois-text-muted">{r.lastTriggeredAt || 'Never'}</span> },
             ]} data={ciRules} />
           </Card>
        </div>
      </Tabs>
    </div>
  );
};
