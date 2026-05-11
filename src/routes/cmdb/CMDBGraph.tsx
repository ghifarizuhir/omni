import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Share2, Search, CheckCircle2, RotateCcw
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { mockCIs, mockCIRelationships } from '@/src/mocks';
import { CIType, RelationshipType, ConfigurationItem } from '../../types/ci';
import { ForceGraph } from '../../components/cmdb/CMDBGraph/ForceGraph';
import { GraphFilterPanel } from '../../components/cmdb/CMDBGraph/GraphFilterPanel';
import { GraphNodeSidePanel } from '../../components/cmdb/CMDBGraph/GraphNodeSidePanel';

// ─── Toast ────────────────────────────────────────────────────────────────────
interface ToastState { message: string }
const Toast: React.FC<ToastState> = ({ message }) => (
  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 pointer-events-none bg-ois-primary text-white">
    <CheckCircle2 size={15} />
    {message}
  </div>
);

export const CMDBGraph: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const focusedParam = searchParams.get('focus');

  const focusCI = useMemo(
    () => mockCIs.find(ci => ci.id === focusedParam || ci.publicId === focusedParam) || null,
    [focusedParam]
  );

  const [selectedTypes, setSelectedTypes] = useState<CIType[]>(
    ['server', 'application', 'database', 'load_balancer', 'service']
  );
  const [selectedRels, setSelectedRels] = useState<RelationshipType[]>(
    ['depends_on', 'contains', 'runs_on', 'connects_to', 'part_of']
  );
  const [selectedNode, setSelectedNode] = useState<ConfigurationItem | null>(focusCI);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message });
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  };

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const typeFilteredNodes = useMemo(() => {
    return mockCIs.filter(ci => selectedTypes.includes(ci.type));
  }, [selectedTypes]);

  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim()) return typeFilteredNodes;
    const q = searchQuery.toLowerCase();
    return typeFilteredNodes.filter(ci =>
      ci.name.toLowerCase().includes(q) || ci.publicId.toLowerCase().includes(q)
    );
  }, [typeFilteredNodes, searchQuery]);

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

  const resetFilters = () => {
    setSelectedTypes(['server', 'application', 'database', 'load_balancer', 'service']);
    setSelectedRels(['depends_on', 'contains', 'runs_on', 'connects_to', 'part_of']);
    setSearchQuery('');
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {toast && <Toast message={toast.message} />}
      <div className="flex items-center justify-between">
        <div>
          {focusCI && (
            <button
              onClick={() => navigate(`/cmdb/${focusCI.id}`)}
              className="flex items-center gap-1 text-sm text-ois-primary font-medium hover:underline mb-1"
            >
              <ArrowLeft size={14} /> Back to {focusCI.name}
            </button>
          )}
          <h1 className="text-2xl font-bold text-ois-text">Infrastructure Topology</h1>
          <p className="text-sm text-ois-text-muted font-medium">Visualizing {filteredNodes.length} nodes and {filteredLinks.length} connections</p>
        </div>
        <div className="flex items-center gap-2">
           <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ois-text-subtle" size={14} />
              <Input
                placeholder="Search nodes..."
                className="pl-9 h-9 bg-white border-ois-border-strong text-sm"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
           </div>
           <Button variant="outline" size="sm" onClick={() => navigate('/cmdb')} className="h-9 px-4">
             List View
           </Button>
           <Button variant="primary" size="sm" className="gap-2 h-9 px-4" onClick={() => showToast('Graph export coming soon')}>
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
          {filteredNodes.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center p-8">
              <p className="text-sm text-ois-text-muted font-medium max-w-xs">
                No nodes match the selected filters — adjust your type or relationship filters
              </p>
              <Button variant="outline" size="sm" className="gap-2" onClick={resetFilters}>
                <RotateCcw size={14} /> Reset filters
              </Button>
            </div>
          ) : (
            <ForceGraph
              nodes={filteredNodes}
              links={filteredLinks}
              onNodeClick={setSelectedNode}
              focusedId={selectedNode?.id}
            />
          )}
        </div>

        <GraphNodeSidePanel
          ci={selectedNode}
          onClose={() => setSelectedNode(null)}
        />
      </div>
    </div>
  );
};
