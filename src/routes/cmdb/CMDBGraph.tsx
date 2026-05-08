import React, { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Share2, Search, Maximize2, ZoomIn, ZoomOut, MousePointer2
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { mockCIs, mockCIRelationships } from '@/src/mocks';
import { CIType, RelationshipType, ConfigurationItem } from '../../types/ci';
import { ForceGraph } from '../../components/cmdb/CMDBGraph/ForceGraph';
import { GraphFilterPanel } from '../../components/cmdb/CMDBGraph/GraphFilterPanel';
import { GraphNodeSidePanel } from '../../components/cmdb/CMDBGraph/GraphNodeSidePanel';

export const CMDBGraph: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const focusedParam = searchParams.get('focus');

  const [selectedTypes, setSelectedTypes] = useState<CIType[]>(
    ['server', 'application', 'database', 'load_balancer', 'service']
  );
  const [selectedRels, setSelectedRels] = useState<RelationshipType[]>(
    ['depends_on', 'contains', 'runs_on', 'connects_to', 'part_of']
  );
  const [selectedNode, setSelectedNode] = useState<ConfigurationItem | null>(
    mockCIs.find(ci => ci.id === focusedParam || ci.publicId === focusedParam) || null
  );

  const filteredNodes = useMemo(() => {
    return mockCIs.filter(ci => selectedTypes.includes(ci.type));
  }, [selectedTypes]);

  const filteredLinks = useMemo(() => {
    return mockCIRelationships.filter(rel => 
      selectedRels.includes(rel.type) &&
      filteredNodes.some(n => n.id === rel.fromCiId) &&
      filteredNodes.some(n => n.id === rel.toCiId)
    );
  }, [filteredNodes, selectedRels]);

  const toggleType = (type: CIType) => {
    setSelectedTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  const toggleRel = (rel: RelationshipType) => {
    setSelectedRels(prev => prev.includes(rel) ? prev.filter(r => r !== rel) : [...prev, rel]);
  };

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ois-text">Infrastructure Topology</h1>
          <p className="text-sm text-ois-text-muted font-medium">Visualizing {filteredNodes.length} nodes and {filteredLinks.length} connections</p>
        </div>
        <div className="flex items-center gap-2">
           <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ois-text-subtle" size={14} />
              <Input placeholder="Search nodes..." className="pl-9 h-9 bg-white border-ois-border-strong text-sm" />
           </div>
           <Button variant="outline" size="sm" onClick={() => navigate('/cmdb')} className="h-9 px-4">
             List View
           </Button>
           <Button variant="primary" size="sm" className="gap-2 h-9 px-4">
             <Share2 size={14} /> Export
           </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex border border-ois-border rounded-xl bg-white overflow-hidden shadow-sm">
        <GraphFilterPanel 
          selectedTypes={selectedTypes}
          onToggleType={toggleType}
          selectedRels={selectedRels}
          onToggleRel={toggleRel}
        />
        
        <div className="flex-1 relative bg-slate-50">
          <ForceGraph 
            nodes={filteredNodes} 
            links={filteredLinks} 
            onNodeClick={setSelectedNode}
            focusedId={selectedNode?.id}
          />
          
          <div className="absolute top-4 left-4 flex gap-2">
             <div className="flex bg-white/80 backdrop-blur border border-ois-border rounded-lg p-0.5 shadow-sm">
                <Button variant="ghost" size="sm" className="w-8 h-8 p-0"><ZoomIn size={14} /></Button>
                <Button variant="ghost" size="sm" className="w-8 h-8 p-0"><ZoomOut size={14} /></Button>
                <div className="w-px h-4 bg-ois-border my-auto mx-1" />
                <Button variant="ghost" size="sm" className="w-8 h-8 p-0"><Maximize2 size={14} /></Button>
             </div>
             <Button variant="outline" size="sm" className="gap-2 h-9 bg-white border-ois-border shadow-sm text-xs font-bold">
               <MousePointer2 size={14} /> Selection Mode
             </Button>
          </div>
        </div>

        <GraphNodeSidePanel 
          ci={selectedNode} 
          onClose={() => setSelectedNode(null)} 
        />
      </div>
    </div>
  );
};
