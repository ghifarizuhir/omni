import React, { useState, useMemo } from 'react';
import { 
  Search, Plus, Download, RefreshCw, Settings, Grid, List as ListIcon, 
  SlidersHorizontal, ChevronDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { mockCIs, mockCIRelationships, mockServices } from '@/src/mocks';
import { CIType, ConfigurationItem, Criticality } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { DataTable } from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/StatusSeverityBadges';
import { cn } from '@/src/lib/utils';
import { formatRelative } from '@/src/lib/format';
import { CIServiceGroup } from '../../components/cmdb/CIServiceGroup';
import { CITreeNode, TreeDataNode } from '../../components/cmdb/CITreeNode';
import { ciTypeMeta } from '../../lib/constants';

type ViewMode = 'tree' | 'list';

export const CMDBList: React.FC = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<CIType | 'all'>('all');
  const [critFilter, setCritFilter] = useState<Criticality | 'all'>('all');
  const [expandedServices, setExpandedServices] = useState<Record<string, boolean>>({
    'svc-001': true,
    'svc-002': true,
    'svc-003': true,
    'unassigned': true
  });

  const filteredCIs = useMemo(() => {
    return mockCIs.filter(ci => {
      const matchesSearch = ci.name.toLowerCase().includes(search.toLowerCase()) || 
                           ci.publicId.toLowerCase().includes(search.toLowerCase()) ||
                           JSON.stringify(ci.attributes).toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === 'all' || ci.type === typeFilter;
      const matchesCrit = critFilter === 'all' || ci.criticality === critFilter;
      return matchesSearch && matchesType && matchesCrit;
    });
  }, [search, typeFilter, critFilter]);

  const toggleService = (id: string) => {
    setExpandedServices(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Build tree data based on filtered results
  const treeData = useMemo(() => {
    const buildTree = (ci: ConfigurationItem): TreeDataNode => {
      const rels = mockCIRelationships.filter(r => r.fromCiId === ci.id);
      return {
        ci,
        children: rels.map(r => {
          const target = mockCIs.find(c => c.id === r.toCiId);
          if (!target) return null;
          return {
            ci: target,
            label: r.type.replace('_', ' '),
            isCrossService: target.serviceId !== ci.serviceId
          } as TreeDataNode;
        }).filter(Boolean) as TreeDataNode[]
      };
    };

    const groupedServices = mockServices.filter(s => ['svc-001', 'svc-002', 'svc-003'].includes(s.id));
    const serviceTrees = groupedServices.map(svc => {
      const apps = filteredCIs.filter(ci => ci.serviceId === svc.id && ci.type === 'application');
      return {
        id: svc.id,
        name: svc.name,
        health: svc.currentHealth,
        nodes: apps.map(buildTree)
      };
    });

    const unassigned = filteredCIs.filter(ci => !ci.serviceId && ci.type !== 'service');
    
    return { serviceTrees, unassignedTrees: unassigned.map(buildTree) };
  }, [filteredCIs]);

  const listColumns = [
    {
      header: 'Public ID',
      accessor: (ci: ConfigurationItem) => <span className="font-mono text-[11px] font-bold text-ois-text-subtle">{ci.publicId}</span>
    },
    {
      header: 'Name',
      accessor: (ci: ConfigurationItem) => <span className="font-semibold text-ois-text">{ci.name}</span>
    },
    {
      header: 'Type',
      accessor: (ci: ConfigurationItem) => (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ciTypeMeta[ci.type]?.color }} />
          <span className="capitalize text-xs font-medium">{ci.type.replace('_', ' ')}</span>
        </div>
      )
    },
    {
      header: 'Service',
      accessor: (ci: ConfigurationItem) => {
        const svc = mockServices.find(s => s.id === ci.serviceId);
        return svc ? <span className="text-xs font-medium text-ois-text-muted">{svc.name}</span> : <span className="text-xs text-ois-text-subtle italic">None</span>;
      }
    },
    {
      header: 'Env',
      accessor: (ci: ConfigurationItem) => <span className="text-[11px] font-bold uppercase text-ois-text-muted tracking-tight">{ci.environment}</span>
    },
    {
      header: 'Health',
      accessor: (ci: ConfigurationItem) => <StatusBadge status={ci.health} />
    },
    {
       header: 'Updated',
       accessor: (ci: ConfigurationItem) => <span className="text-xs text-ois-text-subtle">{formatRelative(ci.updatedAt)}</span>
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ois-text">CMDB Explorer</h1>
          <p className="text-sm text-ois-text-muted font-medium mt-1">
            {mockCIs.length} configuration items · {mockCIRelationships.length} relationships · Last discovery: 12m ago
          </p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="primary" size="sm" className="gap-2 h-9 px-4">
             <Plus size={16} /> Add CI
           </Button>
           <Button variant="outline" size="sm" className="h-9 px-3 border-ois-border-strong bg-white">
             Import
           </Button>
           <div className="w-px h-6 bg-ois-border mx-1" />
           <div className="flex items-center bg-white border border-ois-border-strong rounded-lg p-0.5">
             <button 
               onClick={() => setViewMode('tree')}
               className={cn("p-1.5 rounded-md transition-colors", viewMode === 'tree' ? "bg-ois-primary text-white" : "text-ois-text-subtle hover:text-ois-text")}
               title="Tree View"
             >
               <Grid size={16} />
             </button>
             <button 
               onClick={() => setViewMode('list')}
               className={cn("p-1.5 rounded-md transition-colors", viewMode === 'list' ? "bg-ois-primary text-white" : "text-ois-text-subtle hover:text-ois-text")}
               title="List View"
             >
               <ListIcon size={16} />
             </button>
           </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ois-text-subtle" size={16} />
          <Input 
            placeholder="Search by name, ID, attributes..." 
            className="pl-10 h-10 bg-white border-ois-border-strong"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-2 h-10 border-ois-border-strong bg-white whitespace-nowrap">
            Status <ChevronDown size={14} />
          </Button>
          {(search || typeFilter !== 'all' || critFilter !== 'all') && (
            <button 
              className="text-xs font-bold text-ois-primary hover:underline ml-2"
              onClick={() => { setSearch(''); setTypeFilter('all'); setCritFilter('all'); }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {(['all', ...Object.keys(ciTypeMeta)] as const).map(type => {
            const count = mockCIs.filter(ci => type === 'all' ? ci.type !== 'service' : ci.type === type).length;
            return (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border shrink-0",
                  typeFilter === type 
                    ? "bg-ois-primary text-white border-ois-primary shadow-sm" 
                    : "bg-white text-ois-text-muted border-ois-border-strong hover:bg-ois-surface-muted"
                )}
              >
                {type === 'all' ? 'ALL ITEMS' : type.replace('_', ' ').toUpperCase()}: {count}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {(['all', 'critical', 'high', 'medium', 'low'] as const).map(crit => {
            const count = mockCIs.filter(ci => ci.criticality === crit).length;
            return (
              <button
                key={crit}
                onClick={() => setCritFilter(crit)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border shrink-0",
                  critFilter === crit 
                    ? "bg-ois-primary text-white border-ois-primary shadow-sm" 
                    : "bg-white text-ois-text-muted border-ois-border-strong hover:bg-ois-surface-muted"
                )}
              >
                {crit === 'all' ? 'ALL CRITICALITY' : crit.toUpperCase()}: {count}
              </button>
            );
          })}
        </div>
      </div>

      {filteredCIs.length === 0 ? (
        <Card className="py-24 bg-white text-center">
            <SlidersHorizontal size={32} className="mx-auto text-ois-text-subtle mb-4" />
            <h3 className="text-lg font-bold text-ois-text mb-1">No matching CIs</h3>
            <p className="text-sm text-ois-text-muted mb-6">Try adjusting your filters or search terms.</p>
            <Button variant="outline" onClick={() => { setSearch(''); setTypeFilter('all'); setCritFilter('all'); }}>Clear filters</Button>
        </Card>
      ) : viewMode === 'tree' ? (
        <div className="space-y-4">
          {treeData.serviceTrees.map(svcTree => (
            <div key={svcTree.id} className="border border-ois-border rounded-xl bg-white overflow-hidden shadow-sm">
              <CIServiceGroup 
                name={svcTree.name}
                count={svcTree.nodes.length}
                health={svcTree.health}
                isExpanded={expandedServices[svcTree.id]}
                onToggle={() => toggleService(svcTree.id)}
              />
              {expandedServices[svcTree.id] && (
                <div className="p-4 space-y-2 animate-in slide-in-from-top-1">
                  {svcTree.nodes.length === 0 ? (
                    <div className="text-xs text-ois-text-subtle italic py-2 px-6">No matches in this service</div>
                  ) : (
                    svcTree.nodes.map((node, i) => <CITreeNode key={i} node={node} />)
                  )}
                </div>
              )}
            </div>
          ))}
          
          <div className="border border-ois-border rounded-xl bg-white overflow-hidden shadow-sm">
            <CIServiceGroup 
              name="Unassigned / Infrastructure"
              count={treeData.unassignedTrees.length}
              health="operational"
              isExpanded={expandedServices.unassigned}
              onToggle={() => toggleService('unassigned')}
              isUnassigned
            />
            {expandedServices.unassigned && (
              <div className="p-4 space-y-2">
                {treeData.unassignedTrees.length === 0 ? (
                  <div className="text-xs text-ois-text-subtle italic py-2 px-6">No unassigned matches</div>
                ) : (
                  treeData.unassignedTrees.map((node, i) => <CITreeNode key={i} node={node} />)
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <Card className="overflow-hidden bg-white">
          <DataTable columns={listColumns} data={filteredCIs} onRowClick={(ci) => navigate(`/cmdb/${ci.id}`)} />
          <div className="p-4 border-t border-ois-border flex items-center justify-between text-xs text-ois-text-subtle bg-ois-bg/50">
            <span>Showing {filteredCIs.length} of {mockCIs.length} items</span>
          </div>
        </Card>
      )}
    </div>
  );
};
