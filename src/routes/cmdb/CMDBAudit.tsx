import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Filter, Download, Calendar, ArrowLeft
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { mockCIAuditEntries } from '@/src/mocks';
import { CIAuditTimeline } from '../../components/cmdb/CIAuditTimeline';

export const CMDBAudit: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  const filteredAudit = useMemo(() => {
    return mockCIAuditEntries.filter(entry => {
      const matchesSearch = entry.ciName.toLowerCase().includes(search.toLowerCase()) ||
                            entry.ciPublicId.toLowerCase().includes(search.toLowerCase()) ||
                            entry.actorName.toLowerCase().includes(search.toLowerCase()) ||
                            (entry.field || '').toLowerCase().includes(search.toLowerCase());
      
      const matchesAction = actionFilter === 'all' || entry.action === actionFilter;
      const matchesSource = sourceFilter === 'all' || entry.source === sourceFilter;
      
      return matchesSearch && matchesAction && matchesSource;
    });
  }, [search, actionFilter, sourceFilter]);

  const actions = ['all', 'created', 'updated', 'deleted', 'status_changed', 'relationship_added', 'relationship_removed', 'discovered'];
  const sources = ['all', 'manual', 'discovery', 'api', 'deployment'];

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ois-text">CMDB Audit Log</h1>
          <p className="text-sm text-ois-text-muted font-medium mt-1">
            Tracking {mockCIAuditEntries.length} changes across the infrastructure
          </p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" onClick={() => navigate('/cmdb')} className="h-9">
              <ArrowLeft size={14} className="mr-2" /> Back to CMDB
           </Button>
           <Button variant="primary" size="sm" className="gap-2 h-9 px-4">
             <Download size={14} /> Export CSV
           </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 w-full relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ois-text-subtle" size={16} />
          <Input 
            placeholder="Search audit by CI, actor, or field..." 
            className="pl-10 h-10 border-ois-border-strong bg-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2 h-10 border-ois-border-strong bg-white whitespace-nowrap">
            <Calendar size={14} /> Last 7 Days
          </Button>
          <Button variant="outline" size="sm" className="gap-2 h-10 border-ois-border-strong bg-white whitespace-nowrap">
            <Filter size={14} /> More Filters
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="flex flex-wrap gap-2 mr-4">
          <span className="text-[10px] font-bold text-ois-text-subtle uppercase flex items-center h-8">Action:</span>
          {actions.map(a => (
            <button
              key={a}
              onClick={() => setActionFilter(a)}
              className={cn(
                "px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-colors border",
                actionFilter === a ? "bg-ois-primary text-white border-ois-primary shadow-sm" : "bg-white text-ois-text-muted border-ois-border-strong hover:bg-ois-surface-muted"
              )}
            >
              {a.replace('_', ' ')}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 border-l border-ois-border pl-4">
           <span className="text-[10px] font-bold text-ois-text-subtle uppercase flex items-center h-8">Source:</span>
           {sources.map(s => (
            <button
              key={s}
              onClick={() => setSourceFilter(s)}
              className={cn(
                "px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-colors border",
                sourceFilter === s ? "bg-ois-text text-white border-ois-text shadow-sm" : "bg-white text-ois-text-muted border-ois-border-strong hover:bg-ois-surface-muted"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto bg-white/50 rounded-2xl p-6 border border-ois-border shadow-inner min-h-[600px]">
        {filteredAudit.length === 0 ? (
          <div className="py-20 text-center space-y-3">
             <div className="text-ois-text-subtle opacity-20"><Search size={48} className="mx-auto" /></div>
             <h3 className="font-bold text-ois-text">No audit entries found</h3>
             <p className="text-sm text-ois-text-muted">Try clearing your filters or search terms.</p>
          </div>
        ) : (
          <CIAuditTimeline entries={filteredAudit} />
        )}
      </div>
    </div>
  );
};

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');
