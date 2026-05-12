import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
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
import { getIncidentsByCI } from '@/src/mocks/incidents';
import { IncidentStatusPill } from '@/src/components/incidents/IncidentStatusPill';
import { getChangesByCI } from '@/src/mocks/changes';
import { getProblemsByCI } from '@/src/mocks/problems';
import { getKBArticlesByCI } from '@/src/mocks/kbArticles';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { getMetricsByCI } from '@/src/mocks/capacityMetrics';
import { UtilizationBar } from '@/src/components/capacity/UtilizationBar';
import { TrendIndicator } from '@/src/components/capacity/TrendIndicator';
import { ChangeStatusPill } from '@/src/components/changes/ChangeStatusPill';
import { RiskBadge } from '@/src/components/changes/RiskBadge';
import { MonitoringRule } from '../../types/monitoring';
import { ConfigurationItem } from '../../types/ci';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { StatusBadge } from '../../components/ui/StatusSeverityBadges';
import { DataTable } from '../../components/ui/DataTable';
import { cn } from '@/src/lib/utils';
import { CIQuickFactsCard } from '../../components/cmdb/CIQuickFactsCard';
import { CIAuditTimeline } from '../../components/cmdb/CIAuditTimeline';
import { CITypeIcon } from '../../components/cmdb/CITypeIcon';
import { CIRelationshipBadge } from '../../components/cmdb/CIRelationshipBadge';
import { CIStatusBadge } from '../../components/cmdb/CIStatusBadge';

// ── Helpers ───────────────────────────────────────────────────────────────────

const CI_TYPE_COLOR: Record<string, string> = {
  server: '#1F4FD4', application: '#0BA5EC', database: '#DC6803',
  load_balancer: '#6941C6', service: '#027A48', network: '#475467',
  storage: '#F79009', endpoint: '#B42318',
};

const SectionCard: React.FC<{ title?: string; children: React.ReactNode; className?: string }> = ({
  title, children, className,
}) => (
  <div className={cn('border border-ois-border rounded-lg bg-ois-surface overflow-hidden', className)}>
    {title && (
      <div className="px-4 py-2.5 border-b border-ois-border bg-ois-surface-muted">
        <p className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">{title}</p>
      </div>
    )}
    <div className="p-4">{children}</div>
  </div>
);

const TABS = [
  { id: 'overview',      label: 'Overview' },
  { id: 'relationships', label: 'Relationships' },
  { id: 'incidents',     label: 'Incidents' },
  { id: 'changes',       label: 'Changes' },
  { id: 'problems',      label: 'Problems' },
  { id: 'kb',            label: 'Knowledge Base' },
  { id: 'audit',         label: 'Audit' },
  { id: 'monitoring',    label: 'Monitoring' },
  { id: 'capacity',      label: 'Capacity' },
];

export const CMDBDetail: React.FC = () => {
  const { ciId } = useParams<{ ciId: string }>();
  const navigate = useNavigate();
  const [showJson, setShowJson] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const rawCI = useMemo(() => mockCIs.find(c => c.id === ciId || c.publicId === ciId), [ciId]);
  const [ci, setCi] = useState<ConfigurationItem | null>(() => mockCIs.find(c => c.id === ciId || c.publicId === ciId) ?? null);
  const service = useMemo(() => mockServices.find(s => s.id === ci?.serviceId), [ci]);

  const [editMode, setEditMode] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [editDraft, setEditDraft] = useState({ name: '', status: 'active', environment: 'production', criticality: 'critical' });

  if (!rawCI || !ci) {
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

  const stripeColor = CI_TYPE_COLOR[ci.type] ?? '#475467';

  return (
    <div className="-m-6 flex flex-col bg-ois-bg" style={{ height: 'calc(100vh - 3.5rem)' }}>

      {/* Pinned header */}
      <div className="bg-white border-b border-ois-border shrink-0 z-30">
        {/* Nav row */}
        <div className="flex items-center justify-between px-6 py-2 border-b border-ois-border">
          <button
            onClick={() => navigate('/cmdb')}
            className="flex items-center gap-1.5 text-sm text-ois-text-muted hover:text-ois-text transition-colors"
          >
            <ArrowLeft size={15} /> CMDB
          </button>
          <div className="flex items-center gap-2">
            {editMode ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => setEditMode(false)}>Cancel</Button>
                <Button variant="primary" size="sm" onClick={() => {
                  setCi(prev => prev ? { ...prev, name: editDraft.name, status: editDraft.status as any, environment: editDraft.environment as any, criticality: editDraft.criticality as any } : prev);
                  setEditMode(false);
                }}>Save</Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 h-9 bg-white border-ois-border-strong"
                onClick={() => {
                  setEditDraft({ name: ci.name, status: ci.status, environment: ci.environment, criticality: ci.criticality });
                  setEditMode(true);
                }}
              >
                <Edit2 size={14} /> Edit
              </Button>
            )}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0 bg-white border-ois-border-strong"
                onClick={() => setMoreOpen(v => !v)}
              >
                <MoreHorizontal size={18} />
              </Button>
              {moreOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMoreOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-lg border border-ois-border shadow-ois-dropdown overflow-hidden min-w-[160px]">
                    {[
                      { label: 'Copy CI ID', action: () => navigator.clipboard.writeText(ci.publicId) },
                      { label: 'Copy link', action: () => navigator.clipboard.writeText(window.location.href) },
                    ].map(item => (
                      <button
                        key={item.label}
                        onClick={() => { item.action(); setMoreOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-ois-surface-muted text-ois-text"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Entity header */}
        <div className="flex items-start gap-0">
          <div className="w-1 self-stretch shrink-0" style={{ backgroundColor: stripeColor }} />
          <div className="flex-1 px-6 py-4">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-xs font-semibold text-ois-text-muted">{ci.publicId}</span>
              <CITypeIcon type={ci.type} size={14} />
              <CIStatusBadge status={ci.status} />
            </div>
            {editMode ? (
              <input
                autoFocus
                value={editDraft.name}
                onChange={e => setEditDraft(d => ({ ...d, name: e.target.value }))}
                className="text-xl font-bold text-ois-text border border-ois-primary rounded px-2 py-1 w-full"
              />
            ) : (
              <h1 className="text-xl font-bold text-ois-text leading-tight">{ci.name}</h1>
            )}
            <p className="text-xs text-ois-text-muted mt-2">
              {ci.type} · {ci.environment} · {service?.name ?? '—'}
              {ci.criticality && <span> · <span className="font-medium capitalize">{ci.criticality}</span></span>}
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Left sidebar */}
        <aside className="w-[280px] shrink-0 overflow-y-auto border-r border-ois-border bg-white p-4 space-y-4">
          <CIQuickFactsCard ci={ci} service={service} />
          <SectionCard title="Relationships">
            <div className="space-y-1 text-xs text-ois-text-muted">
              <p>{outgoing.length} outgoing</p>
              <p>{incoming.length} incoming</p>
            </div>
          </SectionCard>
        </aside>

        {/* Center: pinned tab bar + scrollable content */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="border-b border-ois-border bg-white shrink-0 px-6">
            <nav className="flex gap-6 overflow-x-auto scrollbar-hide">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'py-4 px-1 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                    activeTab === tab.id
                      ? 'border-ois-primary text-ois-primary font-bold'
                      : 'border-transparent text-ois-text-muted hover:text-ois-text hover:border-ois-border-strong'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">

            {/* Overview tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <Card>
                  <div className="p-4 border-b border-ois-border bg-ois-surface-muted/20">
                    <h3 className="text-sm font-bold text-ois-text uppercase tracking-wider opacity-60">Specifications</h3>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-y-4 gap-x-8">
                    {Object.entries(ci.attributes).filter(([k]) => k !== 'kind').map(([k, v]) => (
                      <div key={k} className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-ois-text-subtle uppercase">{k.replace(/([A-Z])/g, ' $1')}</span>
                        {k === 'repoUrl' && String(v) ? (
                          <a href={String(v)} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-ois-primary flex items-center gap-1.5 hover:underline">{String(v)} <ExternalLink size={14} /></a>
                        ) : <span className="text-sm font-semibold text-ois-text">{String(v)}</span>}
                      </div>
                    ))}
                  </div>
                </Card>
                <Card>
                  <div className="p-4 border-b border-ois-border bg-ois-surface-muted/20 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-ois-text uppercase tracking-wider opacity-60">Activity</h3>
                    <button onClick={() => navigate(`/cmdb/audit?ci=${ci.publicId}`)} className="text-[10px] font-bold text-ois-primary uppercase hover:underline">View All</button>
                  </div>
                  <div className="p-4 scale-95 origin-top">
                    <CIAuditTimeline entries={mockCIAuditEntries.filter(e => e.ciId === ci.id).slice(0, 5)} showCIInfo={false} />
                  </div>
                </Card>
                <Card>
                  <div className="p-4 border-b border-ois-border bg-ois-surface-muted/20">
                    <h3 className="text-sm font-bold text-ois-text uppercase tracking-wider opacity-60">Health Snapshot</h3>
                  </div>
                  <div className="p-6 flex flex-col items-center justify-center gap-2 text-center">
                    <Activity size={24} className="text-ois-text-subtle opacity-40" />
                    <p className="text-xs text-ois-text-muted font-medium">No health data available</p>
                    <p className="text-[10px] text-ois-text-subtle">Connect a monitoring source to track uptime</p>
                  </div>
                </Card>
              </div>
            )}

            {/* Relationships tab */}
            {activeTab === 'relationships' && (
              <div className="space-y-6">
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
                <div className="flex justify-center">
                  <Button variant="outline" className="gap-2 text-ois-primary border-ois-primary/30" onClick={() => navigate(`/cmdb/graph?focus=${ci.id}`)}>Open in Graph View →</Button>
                </div>
              </div>
            )}

            {/* Incidents tab */}
            {activeTab === 'incidents' && (() => {
              const ciIncidents = getIncidentsByCI(ci.id).concat(getIncidentsByCI(ci.publicId));
              const unique = [...new Map(ciIncidents.map(i => [i.id, i])).values()];
              const open = unique.filter(i => !['resolved', 'closed'].includes(i.status));
              const recent = unique.filter(i => ['resolved', 'closed'].includes(i.status)).slice(0, 3);
              return (
                <Card>
                  <div className="p-3 border-b border-ois-border flex justify-between items-center font-bold text-xs uppercase tracking-wider">
                    <span className="flex items-center gap-2 text-ois-text-muted opacity-80">
                      <AlertCircle size={14} className="text-ois-danger" />
                      Open Incidents ({open.length})
                    </span>
                    <RouterLink to={`/incidents?ci=${ci.publicId}`} className="text-xs text-ois-primary hover:underline font-normal">
                      View all →
                    </RouterLink>
                  </div>
                  {unique.length === 0 ? (
                    <div className="p-6 text-center text-xs text-ois-text-muted italic">No incidents linked to this CI</div>
                  ) : (
                    <div className="divide-y divide-ois-border">
                      {[...open, ...recent].slice(0, 6).map(inc => (
                        <RouterLink
                          key={inc.id}
                          to={`/incidents/${inc.publicId}`}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-ois-surface-muted transition-colors"
                        >
                          <span className="font-mono text-xs font-semibold text-ois-primary w-36 shrink-0">{inc.publicId}</span>
                          <span className="text-xs text-ois-text flex-1 truncate">{inc.title}</span>
                          <IncidentStatusPill status={inc.status} />
                          <span className={cn(
                            "text-xs font-bold shrink-0",
                            inc.priority === 'P1' ? 'text-ois-sev-p1' :
                            inc.priority === 'P2' ? 'text-ois-sev-p2' :
                            inc.priority === 'P3' ? 'text-ois-sev-p3' :
                            'text-ois-text-muted'
                          )}>
                            {inc.priority}
                          </span>
                        </RouterLink>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })()}

            {/* Changes tab */}
            {activeTab === 'changes' && (() => {
              const ciChanges = getChangesByCI(ci.id).concat(getChangesByCI(ci.publicId))
                .filter((c, i, a) => a.findIndex(x => x.id === c.id) === i)
                .slice(0, 5);
              return (
                <Card>
                  <div className="p-3 border-b border-ois-border flex justify-between items-center font-bold text-xs uppercase tracking-wider opacity-60">
                    Linked Changes <ShieldCheck size={14} className="text-ois-info" />
                  </div>
                  {ciChanges.length === 0 ? (
                    <div className="p-8 text-center text-xs text-ois-text-muted italic">No recent changes linked</div>
                  ) : (
                    <div className="divide-y divide-ois-border">
                      {ciChanges.map(chg => (
                        <RouterLink key={chg.id} to={`/changes/${chg.publicId}`} className="flex items-center justify-between px-4 py-3 hover:bg-ois-bg transition-colors">
                          <div>
                            <span className="font-mono text-xs font-bold text-ois-primary">{chg.publicId}</span>
                            <p className="text-xs text-ois-text mt-0.5 line-clamp-1">{chg.title}</p>
                          </div>
                          <div className="flex items-center gap-2 ml-3 shrink-0">
                            <ChangeStatusPill status={chg.status} size="sm" />
                            <RiskBadge risk={chg.risk} size="sm" />
                          </div>
                        </RouterLink>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })()}

            {/* Problems tab */}
            {activeTab === 'problems' && (() => {
              const ciProblems = getProblemsByCI(ci.id).concat(getProblemsByCI(ci.publicId))
                .filter((p, i, a) => a.findIndex(x => x.id === p.id) === i)
                .slice(0, 5);
              return (
                <Card>
                  <div className="p-3 border-b border-ois-border flex justify-between items-center font-bold text-xs uppercase tracking-wider opacity-60">
                    Linked Problems ({ciProblems.length}) <Bug size={14} className="text-ois-warning" />
                  </div>
                  {ciProblems.length === 0 ? (
                    <div className="p-8 text-center text-xs text-ois-text-muted italic">No linked problems</div>
                  ) : (
                    <div className="divide-y divide-ois-border">
                      {ciProblems.map(prb => (
                        <RouterLink key={prb.id} to={`/problems/${prb.publicId}`} className="flex items-center gap-3 px-4 py-3 hover:bg-ois-surface-muted transition-colors">
                          <span className="font-mono text-xs font-semibold text-ois-primary w-36 shrink-0">{prb.publicId}</span>
                          <span className="text-xs text-ois-text flex-1 truncate">{prb.title}</span>
                        </RouterLink>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })()}

            {/* Knowledge Base tab */}
            {activeTab === 'kb' && (() => {
              const ciKBArticles = getKBArticlesByCI(ci.id).concat(getKBArticlesByCI(ci.publicId))
                .filter((a, i, arr) => arr.findIndex(x => x.id === a.id) === i)
                .slice(0, 5);
              return (
                <Card>
                  <div className="p-3 border-b border-ois-border flex justify-between items-center font-bold text-xs uppercase tracking-wider opacity-60">
                    Linked KB ({ciKBArticles.length}) <BookOpen size={14} className="text-ois-primary" />
                  </div>
                  {ciKBArticles.length === 0 ? (
                    <div className="p-8 text-center text-xs text-ois-text-muted italic">No linked KB articles</div>
                  ) : (
                    <div className="divide-y divide-ois-border">
                      {ciKBArticles.map(art => (
                        <RouterLink key={art.id} to={`/kb/${art.slug}`} className="flex items-center gap-3 px-4 py-3 hover:bg-ois-surface-muted transition-colors">
                          <span className="font-mono text-xs font-semibold text-ois-primary w-24 shrink-0">{art.publicId}</span>
                          <span className="text-xs text-ois-text flex-1 truncate">{art.title}</span>
                        </RouterLink>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })()}

            {/* Audit tab */}
            {activeTab === 'audit' && (
              <div className="max-w-3xl mx-auto py-4">
                <CIAuditTimeline entries={mockCIAuditEntries.filter(e => e.ciId === ci.id)} showCIInfo={false} />
              </div>
            )}

            {/* Monitoring tab */}
            {activeTab === 'monitoring' && (
              <div className="space-y-4">
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
                    { header: 'Last Triggered', accessor: (r: any) => <span className="text-xs text-ois-text-muted">{r.lastTriggeredAt ? `${formatDistanceToNow(parseISO(r.lastTriggeredAt))} ago` : 'Never'}</span> },
                  ]} data={ciRules} />
                </Card>
              </div>
            )}

            {/* Capacity tab */}
            {activeTab === 'capacity' && (
              <div className="space-y-3">
                {(() => {
                  const ciMetrics = getMetricsByCI(ci.id);
                  if (ciMetrics.length === 0) {
                    return (
                      <div className="py-12 text-center text-ois-text-muted">
                        <p className="text-sm">No capacity metrics tracked for this CI.</p>
                      </div>
                    );
                  }
                  return ciMetrics.map(metric => (
                    <div key={metric.id} className="border border-ois-border rounded-lg p-4 space-y-2 bg-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-mono text-xs text-ois-text-muted">{metric.publicId}</span>
                          <p className="text-sm font-semibold text-ois-text mt-0.5">{metric.name}</p>
                        </div>
                        <TrendIndicator trend={metric.trend7d} changePercent={metric.changePercent7d} size="sm" />
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <UtilizationBar
                            value={metric.utilizationPercent}
                            warningThreshold={metric.warningThreshold}
                            criticalThreshold={metric.criticalThreshold}
                            showLabel
                          />
                        </div>
                      </div>
                      <p className="text-xs text-ois-text-muted">
                        Current: {metric.currentValue}{metric.unit} of {metric.capacityValue}{metric.unit} · Peak 24h: {metric.peakLast24h}{metric.unit}
                      </p>
                    </div>
                  ));
                })()}
              </div>
            )}

          </div>
        </div>

        {/* Right sidebar */}
        <aside className="w-[280px] shrink-0 overflow-y-auto border-l border-ois-border bg-white p-4 space-y-4">
          {ciRules.length > 0 && (
            <SectionCard title={`Monitoring (${ciRules.length})`}>
              <div className="space-y-2">
                {ciRules.slice(0, 5).map(rule => (
                  <div key={rule.id} className="text-xs">
                    <p className="font-medium text-ois-text truncate">{rule.name}</p>
                    <p className="text-ois-text-subtle">{rule.severity}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
          <SectionCard title="Export">
            <button
              onClick={() => setShowJson(v => !v)}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium border border-ois-border text-ois-text hover:bg-ois-surface-muted transition-colors"
            >
              <FileJson size={13} className="text-ois-text-subtle" />
              {showJson ? 'Hide JSON' : 'View JSON'}
            </button>
          </SectionCard>
          {showJson && (
            <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto">
              <pre className="text-[11px] text-blue-300 leading-relaxed font-mono">{JSON.stringify(ci, null, 2)}</pre>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
