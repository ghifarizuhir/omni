import React, { useState, useMemo } from 'react';
import { 
  Plus, Search, Filter, Phone, Mail, 
  MessageSquare, Slack, Settings, ArrowRight,
  Shield, Bell, Layers, Zap, Clock, Users,
  Globe, Hash, MoreVertical, X, Check,
  ChevronDown, ChevronUp, Copy, History,
  Trash2, AlertTriangle, Info, Play,
  Smartphone, Monitor, Code
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { 
  mockAlertRoutes, 
  mockMonitoringRules,
  mockTeams,
  mockUsers
} from '../../mocks';
import { cn } from '../../lib/utils';
import { 
  AlertRoute, 
  AlertChannel, 
  EscalationStep, 
  AlertRecipient,
  RecipientType
} from '../../types/monitoring';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Severity } from '../../types/common';

export const AlertRouting: React.FC = () => {
  // --- State ---
  const [routes, setRules] = useState<AlertRoute[]>(mockAlertRoutes);
  const [selectedRouteId, setSelectedRouteId] = useState<string>(mockAlertRoutes[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Local state for editing to allow "Save Changes" pattern
  const [editBuffer, setEditBuffer] = useState<AlertRoute | null>(null);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // --- Derived ---
  const filteredRoutes = useMemo(() => {
    return routes.filter(r => 
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.publicId.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [routes, searchQuery]);

  const selectedRoute = useMemo(() => {
    return routes.find(r => r.id === selectedRouteId) || null;
  }, [routes, selectedRouteId]);

  const isDirty = useMemo(() => {
    if (!editBuffer || !selectedRoute) return false;
    return JSON.stringify(editBuffer) !== JSON.stringify(selectedRoute);
  }, [editBuffer, selectedRoute]);

  const matchingRules = useMemo(() => {
    if (!selectedRoute) return [];
    return mockMonitoringRules.filter(rule => rule.alertRouteId === selectedRoute.id);
  }, [selectedRoute]);

  // --- Handlers ---
  const handleSelectRoute = (id: string) => {
    setSelectedRouteId(id);
    const route = routes.find(r => r.id === id);
    if (route) {
      setEditBuffer(JSON.parse(JSON.stringify(route)));
    }
  };

  // Initialize edit buffer on first mount if routes exist
  React.useEffect(() => {
    if (selectedRoute && !editBuffer) {
      setEditBuffer(JSON.parse(JSON.stringify(selectedRoute)));
    }
  }, [selectedRoute, editBuffer]);

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const updateBuffer = (updates: Partial<AlertRoute>) => {
    if (!editBuffer) return;
    setEditBuffer({ ...editBuffer, ...updates });
  };

  const handleSaveChanges = () => {
    if (!editBuffer) return;
    setRules(prev => prev.map(r => r.id === editBuffer.id ? editBuffer : r));
  };

  const getChannelIcon = (channel: AlertChannel) => {
    switch (channel) {
      case 'email': return <Mail size={14} />;
      case 'slack': return <Hash size={14} />;
      case 'sms': return <Smartphone size={14} />;
      case 'in_app': return <Monitor size={14} />;
      case 'teams': return <Users size={14} />;
      case 'webhook': return <Globe size={14} />;
      default: return <Bell size={14} />;
    }
  };

  const toggleChannel = (channel: AlertChannel) => {
    if (!editBuffer) return;
    const channels = editBuffer.channels.includes(channel)
      ? editBuffer.channels.filter(c => c !== channel)
      : [...editBuffer.channels, channel];
    updateBuffer({ channels });
  };

  const toggleSeverity = (sev: Severity) => {
    if (!editBuffer) return;
    const severities = editBuffer.matchExpression.severities || [];
    const newSeverities = severities.includes(sev)
      ? severities.filter(s => s !== sev)
      : [...severities, sev];
    updateBuffer({
      matchExpression: { ...editBuffer.matchExpression, severities: newSeverities }
    });
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-ois-text tracking-tight mb-2">Alert Routing</h1>
          <div className="flex items-center gap-4 text-sm font-medium text-ois-text-muted">
            <span>{routes.length} routes</span>
            <span className="w-1 h-1 rounded-full bg-ois-border" />
            <span>{mockMonitoringRules.length} rules using these routes</span>
            <span className="w-1 h-1 rounded-full bg-ois-border" />
            <span>8 channels configured</span>
          </div>
        </div>
        <Button variant="primary" className="h-10 px-6 font-bold gap-2 shadow-sm">
          <Plus size={18} /> New route
        </Button>
      </div>

      <div className="flex gap-6 h-[calc(100vh-220px)] min-h-[600px]">
        {/* Left Column - Route List */}
        <div className="w-[400px] flex flex-col gap-4 overflow-hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ois-text-subtle" size={18} />
            <Input 
              placeholder="Search routes..." 
              className="pl-10 h-11 border-ois-border-strong bg-white shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {filteredRoutes.map((route) => (
              <button
                key={route.id}
                onClick={() => handleSelectRoute(route.id)}
                className={cn(
                  "w-full text-left p-5 rounded-xl border-2 transition-all group relative overflow-hidden bg-white shadow-sm hover:border-ois-border-strong",
                  selectedRouteId === route.id ? "border-ois-primary ring-1 ring-ois-primary/10 shadow-md" : "border-ois-border"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[10px] font-bold text-ois-text-subtle uppercase tracking-wider">{route.publicId}</span>
                  <div className="flex items-center gap-1.5">
                    <div className={cn("w-2 h-2 rounded-full", route.enabled ? "bg-ois-success" : "bg-ois-border-strong")} />
                    <span className="text-[10px] font-bold text-ois-text-muted uppercase">{route.enabled ? 'Enabled' : 'Disabled'}</span>
                  </div>
                </div>
                <h3 className="text-sm font-bold text-ois-text mb-1 group-hover:text-ois-primary transition-colors">{route.name}</h3>
                <p className="text-xs text-ois-text-muted mb-4 line-clamp-2 leading-relaxed">{route.description}</p>
                
                <div className="flex items-center justify-between pt-4 border-t border-ois-border">
                  <div className="flex items-center gap-1.5">
                    {route.channels.slice(0, 3).map(c => (
                      <div key={c} title={c} className="w-5 h-5 flex items-center justify-center rounded border border-ois-border text-ois-text-subtle">
                        {getChannelIcon(c)}
                      </div>
                    ))}
                    {route.channels.length > 3 && (
                      <span className="text-[10px] font-bold text-ois-text-subtle">+{route.channels.length - 3}</span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-ois-text-subtle uppercase">Rules: {route.ruleCount}</p>
                    {route.lastTriggeredAt && (
                      <p className="text-[10px] font-medium text-ois-text-muted mt-0.5">
                        Fired {formatDistanceToNow(parseISO(route.lastTriggeredAt))} ago
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
            
            {filteredRoutes.length === 0 && (
              <div className="py-20 text-center">
                <p className="text-sm text-ois-text-muted font-medium">No routes match. <button onClick={() => setSearchQuery('')} className="text-ois-primary hover:underline">Clear search</button></p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Editor */}
        <div className="flex-1 flex flex-col min-w-0 bg-white rounded-2xl border border-ois-border shadow-sm overflow-hidden">
          {!editBuffer ? (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center">
              <div className="p-4 bg-ois-bg rounded-2xl mb-4">
                <Layers size={48} className="text-ois-text-subtle" />
              </div>
              <h3 className="text-xl font-bold text-ois-text">Select a route to edit</h3>
              <p className="text-sm text-ois-text-muted max-w-sm mt-2">
                Configure who gets notified, through which channels, and define the escalation policy for system events.
              </p>
            </div>
          ) : (
            <>
              {/* Editor Header */}
              <div className="px-8 py-6 border-b border-ois-border flex items-start justify-between bg-white sticky top-0 z-10">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-2xl font-bold text-ois-text tracking-tight uppercase font-mono">{editBuffer.publicId}</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateBuffer({ enabled: !editBuffer.enabled })}
                      className={cn(
                        "h-6 px-2 rounded-full text-[10px] font-bold uppercase flex items-center gap-1.5 transition-all",
                        editBuffer.enabled ? "bg-ois-success-pale text-ois-success border border-ois-success/20" : "bg-ois-border text-ois-text-muted border border-ois-border"
                      )}
                    >
                      <div className={cn("w-1.5 h-1.5 rounded-full", editBuffer.enabled ? "bg-ois-success" : "bg-ois-border-strong")} />
                      {editBuffer.enabled ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>
                  <h3 className="text-lg font-semibold text-ois-text-muted">{editBuffer.name}</h3>
                  <p className="text-sm text-ois-text-muted mt-2 max-w-2xl leading-relaxed">
                    {editBuffer.description} <span className="text-ois-text-subtle ml-2 italic">· Last updated {formatDistanceToNow(parseISO(editBuffer.updatedAt))} ago</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="primary"
                    disabled={!isDirty}
                    onClick={handleSaveChanges}
                    className="h-10 px-6 font-bold shadow-sm disabled:opacity-50"
                  >
                    Save changes
                  </Button>
                  <div className="relative group">
                    <Button variant="ghost" className="h-10 w-10 p-0 border border-ois-border hover:bg-ois-bg rounded-lg">
                      <MoreVertical size={20} className="text-ois-text-muted" />
                    </Button>
                    {/* Dropdown would go here */}
                  </div>
                </div>
              </div>

              {/* Editor Body */}
              <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                {/* Match Conditions */}
                <section className="space-y-4">
                  <button 
                    onClick={() => toggleSection('match')}
                    className="flex items-center gap-3 group w-full text-left"
                  >
                    <div className="p-1.5 bg-ois-bg rounded-lg group-hover:bg-ois-primary-pale group-hover:text-ois-primary transition-colors">
                      <Filter size={18} />
                    </div>
                    <h4 className="text-sm font-bold text-ois-text uppercase tracking-widest flex-1">Match conditions</h4>
                    {collapsedSections['match'] ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                  </button>
                  
                  {!collapsedSections['match'] && (
                    <div className="pl-11 space-y-6">
                      <div className="space-y-3">
                        <p className="text-xs font-bold text-ois-text-subtle uppercase tracking-wider">Severity</p>
                        <div className="flex flex-wrap gap-2">
                          {(['P1', 'P2', 'P3', 'P4'] as Severity[]).map(sev => (
                            <button
                              key={sev}
                              onClick={() => toggleSeverity(sev)}
                              className={cn(
                                "h-8 px-3 rounded-lg text-[11px] font-bold border-2 transition-all flex items-center gap-2",
                                (editBuffer.matchExpression.severities || []).includes(sev)
                                  ? "bg-ois-primary border-ois-primary text-white"
                                  : "bg-white border-ois-border text-ois-text-muted hover:border-ois-border-strong"
                              )}
                            >
                              {sev}
                              {(editBuffer.matchExpression.severities || []).includes(sev) && <X size={12} />}
                            </button>
                          ))}
                          <Button variant="ghost" size="sm" className="h-8 text-xs font-bold text-ois-primary gap-1">+ Add severity</Button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="text-xs font-bold text-ois-text-subtle uppercase tracking-wider">Sources</p>
                        <div className="flex flex-wrap gap-2">
                          {editBuffer.matchExpression.sources?.map(src => (
                            <Badge key={src} variant="neutral" className="bg-blue-50 text-blue-700 border-blue-100 flex items-center gap-2 h-8 px-3">
                              {src} <button><X size={12} /></button>
                            </Badge>
                          ))}
                          <Button variant="ghost" size="sm" className="h-8 text-xs font-bold text-ois-primary gap-1">+ Add source</Button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="text-xs font-bold text-ois-text-subtle uppercase tracking-wider">Tags</p>
                        <div className="flex flex-wrap gap-2">
                          {editBuffer.matchExpression.tags?.map(tag => (
                            <Badge key={tag} variant="neutral" className="bg-slate-50 text-slate-700 border-ois-border flex items-center gap-2 h-8 px-3">
                              #{tag} <button><X size={12} /></button>
                            </Badge>
                          ))}
                          <Button variant="ghost" size="sm" className="h-8 text-xs font-bold text-ois-primary gap-1">+ Add tag</Button>
                        </div>
                      </div>

                      <div className="p-4 bg-ois-bg rounded-xl border border-ois-border">
                         <div className="flex items-center gap-2 mb-3">
                            <Shield size={14} className="text-ois-primary" />
                            <span className="text-xs font-bold text-ois-text">Matches {matchingRules.length} rules:</span>
                         </div>
                         <ul className="space-y-2">
                            {matchingRules.map(rule => (
                              <li key={rule.id} className="flex items-center gap-3">
                                 <span className="font-mono text-[10px] font-bold text-ois-text-subtle w-24 shrink-0">{rule.publicId}</span>
                                 <span className="text-xs text-ois-text-muted truncate">{rule.name}</span>
                              </li>
                            ))}
                         </ul>
                      </div>
                    </div>
                  )}
                </section>

                <hr className="border-ois-border" />

                {/* Channels */}
                <section className="space-y-4">
                  <button 
                    onClick={() => toggleSection('channels')}
                    className="flex items-center gap-3 group w-full text-left"
                  >
                    <div className="p-1.5 bg-ois-bg rounded-lg group-hover:bg-ois-primary-pale group-hover:text-ois-primary transition-colors">
                      <Zap size={18} />
                    </div>
                    <h4 className="text-sm font-bold text-ois-text uppercase tracking-widest flex-1">Channels</h4>
                    {collapsedSections['channels'] ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                  </button>

                  {!collapsedSections['channels'] && (
                    <div className="pl-11 grid grid-cols-2 gap-4">
                      {(['sms', 'slack', 'email', 'in_app', 'teams', 'webhook'] as AlertChannel[]).map(ch => (
                        <div 
                          key={ch}
                          className={cn(
                            "p-4 rounded-xl border transition-all relative flex flex-col gap-2",
                            editBuffer.channels.includes(ch) ? "border-ois-primary bg-ois-primary-pale/30" : "border-ois-border bg-white"
                          )}
                        >
                           <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                 <div className={cn(
                                   "p-2 rounded-lg",
                                   editBuffer.channels.includes(ch) ? "bg-ois-primary text-white" : "bg-ois-bg text-ois-text-subtle"
                                 )}>
                                    {getChannelIcon(ch)}
                                 </div>
                                 <span className="text-sm font-bold text-ois-text capitalize">{ch.replace('_', ' ')}</span>
                              </div>
                              <input 
                                type="checkbox" 
                                checked={editBuffer.channels.includes(ch)}
                                onChange={() => toggleChannel(ch)}
                                className="w-5 h-5 rounded border-ois-border text-ois-primary focus:ring-ois-primary"
                              />
                           </div>
                           {editBuffer.channels.includes(ch) && (
                              <div className="mt-2 pt-3 border-t border-ois-primary/10 flex items-center justify-between">
                                 <span className="text-[10px] font-medium text-ois-text-muted">
                                    {ch === 'slack' ? '#platform-oncall' : ch === 'sms' ? '(Twilio)' : ch === 'email' ? 'platform-oncall@acme.io' : 'Standard persistent'}
                                 </span>
                                 <button className="text-[10px] font-bold text-ois-primary hover:underline">Edit</button>
                              </div>
                           )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <hr className="border-ois-border" />

                {/* Escalation Policy */}
                <section className="space-y-4">
                  <button 
                    onClick={() => toggleSection('escalation')}
                    className="flex items-center gap-3 group w-full text-left"
                  >
                    <div className="p-1.5 bg-ois-bg rounded-lg group-hover:bg-ois-primary-pale group-hover:text-ois-primary transition-colors">
                      <Layers size={18} />
                    </div>
                    <h4 className="text-sm font-bold text-ois-text uppercase tracking-widest flex-1">Escalation policy</h4>
                    {collapsedSections['escalation'] ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                  </button>

                  {!collapsedSections['escalation'] && (
                    <div className="pl-11 space-y-6">
                       <div className="relative space-y-4 before:absolute before:left-[19px] before:top-4 before:bottom-4 before:w-0.5 before:bg-ois-border">
                          {editBuffer.escalationSteps.map((step, idx) => (
                             <div key={step.id} className="relative pl-12">
                                <div className="absolute left-0 top-3 w-10 h-10 rounded-full bg-white border-2 border-ois-border flex items-center justify-center font-bold text-sm text-ois-text z-10 shadow-sm">
                                   {idx + 1}
                                </div>
                                <div className="p-5 rounded-xl border border-ois-border bg-white hover:border-ois-border-strong hover:shadow-md transition-all group/step">
                                   <div className="flex items-start justify-between mb-4">
                                      <div>
                                         <p className="text-sm font-bold text-ois-text">
                                            {step.delayMinutes === 0 ? 'Immediate action' : `After ${step.delayMinutes} min if not acknowledged`}
                                         </p>
                                         <p className="text-[10px] font-bold text-ois-text-subtle uppercase tracking-widest mt-0.5">Delay: {step.delayMinutes} min</p>
                                      </div>
                                      <div className="flex items-center gap-1 opacity-0 group-hover/step:opacity-100 transition-opacity">
                                         <Button variant="ghost" size="sm" className="h-8 px-3 font-bold text-[11px] text-ois-primary">Edit step</Button>
                                         <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-ois-danger"><Trash2 size={14} /></Button>
                                      </div>
                                   </div>
                                   
                                   <div className="grid grid-cols-2 gap-6">
                                      <div className="space-y-2">
                                         <p className="text-[10px] font-bold text-ois-text-subtle uppercase tracking-wider">Recipients</p>
                                         <div className="space-y-1.5">
                                            {step.recipients.map(r => (
                                              <div key={r.id} className="flex items-center gap-2">
                                                 <div className="p-1 px-1.5 bg-ois-bg rounded text-ois-text-muted"><Users size={10} /></div>
                                                 <span className="text-xs font-semibold text-ois-text">{r.targetName}</span>
                                              </div>
                                            ))}
                                         </div>
                                      </div>
                                      <div className="space-y-2">
                                         <p className="text-[10px] font-bold text-ois-text-subtle uppercase tracking-wider">Channels</p>
                                         <div className="flex flex-wrap gap-2">
                                            {step.channels.map(c => (
                                              <Badge key={c} variant="neutral" className="bg-white border-ois-border text-[9px] font-bold text-ois-text-muted capitalize">
                                                 {c.replace('_', ' ')}
                                              </Badge>
                                            ))}
                                         </div>
                                      </div>
                                   </div>
                                </div>
                             </div>
                          ))}
                       </div>
                       <Button variant="ghost" className="h-12 w-full border-2 border-dashed border-ois-border rounded-xl text-sm font-bold text-ois-text-subtle hover:border-ois-primary hover:text-ois-primary hover:bg-ois-primary-pale gap-2">
                          <Plus size={18} /> Add escalation step
                       </Button>
                    </div>
                  )}
                </section>

                <hr className="border-ois-border" />

                {/* Quiet Hours */}
                <section className="space-y-4">
                  <button 
                    onClick={() => toggleSection('quiet')}
                    className="flex items-center gap-3 group w-full text-left"
                  >
                    <div className="p-1.5 bg-ois-bg rounded-lg group-hover:bg-ois-primary-pale group-hover:text-ois-primary transition-colors">
                      <Clock size={18} />
                    </div>
                    <h4 className="text-sm font-bold text-ois-text uppercase tracking-widest flex-1">Quiet hours</h4>
                    {collapsedSections['quiet'] ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                  </button>

                  {!collapsedSections['quiet'] && (
                    <div className="pl-11">
                       <label className="flex items-start gap-4 p-5 rounded-xl border border-ois-border bg-white cursor-pointer hover:border-ois-border-strong transition-all">
                          <input 
                            type="checkbox" 
                            checked={editBuffer.quietHours?.enabled}
                            onChange={(e) => updateBuffer({ 
                              quietHours: { 
                                enabled: e.target.checked,
                                timezone: editBuffer.quietHours?.timezone || 'UTC',
                                fromHour: editBuffer.quietHours?.fromHour || 22,
                                toHour: editBuffer.quietHours?.toHour || 6,
                                daysOfWeek: editBuffer.quietHours?.daysOfWeek || [0, 6]
                              } 
                            })}
                            className="mt-1 w-5 h-5 rounded border-ois-border text-ois-primary focus:ring-ois-primary"
                          />
                          <div className="flex-1">
                             <p className="text-sm font-bold text-ois-text">Enable quiet hours</p>
                             <p className="text-xs text-ois-text-muted mt-1 leading-relaxed">During quiet hours, only P1 alerts will bypass suppression and trigger notifications. All other events will be queued for the next window.</p>
                             
                             {editBuffer.quietHours?.enabled && (
                                <div className="mt-6 grid grid-cols-2 lg:grid-cols-3 gap-6 pt-6 border-t border-ois-border">
                                   <div className="space-y-2">
                                      <p className="text-[10px] font-bold text-ois-text-subtle uppercase tracking-wider">Timezone</p>
                                      <select className="w-full h-10 px-3 rounded-lg border border-ois-border-strong bg-white text-sm font-bold outline-none">
                                         <option>UTC</option>
                                         <option>America/New_York</option>
                                         <option>Asia/Jakarta</option>
                                      </select>
                                   </div>
                                   <div className="space-y-2">
                                      <p className="text-[10px] font-bold text-ois-text-subtle uppercase tracking-wider">Window</p>
                                      <div className="flex items-center gap-2">
                                         <select className="h-10 px-3 rounded-lg border border-ois-border-strong bg-white text-sm font-bold outline-none flex-1">
                                            <option>22:00</option>
                                         </select>
                                         <span className="text-ois-text-subtle text-xs">to</span>
                                         <select className="h-10 px-3 rounded-lg border border-ois-border-strong bg-white text-sm font-bold outline-none flex-1">
                                            <option>06:00</option>
                                         </select>
                                      </div>
                                   </div>
                                   <div className="space-y-2">
                                      <p className="text-[10px] font-bold text-ois-text-subtle uppercase tracking-wider">Active days</p>
                                      <div className="flex gap-1.5">
                                         {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                                           <button 
                                             key={i} 
                                             className={cn(
                                               "w-8 h-8 rounded-lg text-[10px] font-bold transition-all border",
                                               editBuffer.quietHours?.daysOfWeek.includes(i) ? "bg-ois-primary text-white border-ois-primary shadow-sm" : "bg-white text-ois-text-muted border-ois-border hover:border-ois-border-strong"
                                             )}
                                           >
                                             {day}
                                           </button>
                                         ))}
                                      </div>
                                   </div>
                                </div>
                             )}
                          </div>
                       </label>
                    </div>
                  )}
                </section>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Test Route Modal */}
      <Modal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        title={`Test route: ${editBuffer?.publicId}`}
        size="md"
      >
        <div className="space-y-6 py-4">
           {/* Modal content same as in MonitoringRules or tailored for routing */}
           <div className="p-4 bg-ois-warning-pale border border-ois-warning/20 rounded-xl">
              <p className="text-xs text-ois-warning flex items-start gap-2 leading-tight">
                 <Info size={16} className="shrink-0" />
                 This will simulate a test event payload matching this route's conditions and dry-run the escalation steps.
              </p>
           </div>
           
           <div className="flex items-center justify-between pt-6 border-t border-ois-border">
              <span className="text-[10px] font-bold text-ois-text-subtle uppercase">Last test: {formatDistanceToNow(parseISO(editBuffer?.updatedAt || new Date().toISOString()))} ago</span>
              <div className="flex items-center gap-3">
                 <Button variant="ghost" className="h-10 font-bold text-ois-text-muted" onClick={() => setIsTestModalOpen(false)}>
                    Cancel
                 </Button>
                 <Button variant="primary" className="h-10 px-8 font-bold gap-2">
                    <Play size={16} /> Run dry-run
                 </Button>
              </div>
           </div>
        </div>
      </Modal>
    </div>
  );
};

