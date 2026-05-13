import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { ConfigurationItem, CIRelationship } from '../../../types/ci';
import { downloadBlob } from '../../../lib/download';

interface ExportGraphModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: ConfigurationItem[];
  links: CIRelationship[];
  onExported: (filename: string) => void;
}

type GraphFormat = 'json' | 'dot' | 'cypher';

const FORMATS: { value: GraphFormat; label: string; description: string; ext: string }[] = [
  { value: 'json', label: 'JSON', description: 'Nodes & edges, easy to import elsewhere.', ext: 'json' },
  { value: 'dot',  label: 'Graphviz DOT', description: 'Render with `dot -Tsvg` to produce SVG.', ext: 'dot' },
  { value: 'cypher', label: 'Cypher', description: 'Neo4j CREATE statements for the topology.', ext: 'cypher' },
];

const escapeDot = (s: string) => s.replace(/"/g, '\\"');

function buildDot(nodes: ConfigurationItem[], links: CIRelationship[]): string {
  const lines = [
    'digraph CMDB {',
    '  rankdir=LR;',
    '  node [shape=box, style=rounded];',
    ...nodes.map(n => `  "${n.publicId}" [label="${escapeDot(n.name)}\\n${n.type}"];`),
    ...links.map(l => {
      const from = nodes.find(n => n.id === l.fromCiId)?.publicId ?? l.fromCiId;
      const to = nodes.find(n => n.id === l.toCiId)?.publicId ?? l.toCiId;
      return `  "${from}" -> "${to}" [label="${l.type}"];`;
    }),
    '}',
  ];
  return lines.join('\n');
}

function buildCypher(nodes: ConfigurationItem[], links: CIRelationship[]): string {
  const nodeStmts = nodes.map(n =>
    `CREATE (:CI {publicId: "${n.publicId}", name: "${n.name.replace(/"/g, '\\"')}", type: "${n.type}", environment: "${n.environment}"})`
  );
  const relStmts = links.map(l => {
    const from = nodes.find(n => n.id === l.fromCiId)?.publicId;
    const to = nodes.find(n => n.id === l.toCiId)?.publicId;
    if (!from || !to) return '';
    return `MATCH (a:CI {publicId: "${from}"}), (b:CI {publicId: "${to}"}) CREATE (a)-[:${l.type.toUpperCase()}]->(b);`;
  }).filter(Boolean);
  return [...nodeStmts, ...relStmts].join('\n');
}

export const ExportGraphModal: React.FC<ExportGraphModalProps> = ({
  isOpen, onClose, nodes, links, onExported,
}) => {
  const [format, setFormat] = useState<GraphFormat>('json');

  const handleExport = () => {
    const meta = FORMATS.find(f => f.value === format)!;
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `cmdb-topology-${stamp}.${meta.ext}`;
    let content = '';
    let mime = 'text/plain';
    if (format === 'json') {
      content = JSON.stringify({
        exportedAt: new Date().toISOString(),
        nodeCount: nodes.length,
        linkCount: links.length,
        nodes: nodes.map(n => ({
          id: n.id,
          publicId: n.publicId,
          name: n.name,
          type: n.type,
          environment: n.environment,
          criticality: n.criticality,
          health: n.health,
        })),
        links: links.map(l => ({
          from: l.fromCiId,
          to: l.toCiId,
          type: l.type,
        })),
      }, null, 2);
      mime = 'application/json';
    } else if (format === 'dot') {
      content = buildDot(nodes, links);
    } else {
      content = buildCypher(nodes, links);
    }
    downloadBlob(content, filename, mime);
    onExported(filename);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Export topology" size="md">
      <div className="space-y-5 py-3">
        <p className="text-sm text-ois-text-muted">
          Exporting <span className="font-semibold text-ois-text">{nodes.length}</span> nodes
          and <span className="font-semibold text-ois-text">{links.length}</span> links from the current view.
        </p>

        <div className="space-y-2">
          <label className="text-xs font-bold text-ois-text-subtle uppercase tracking-wider">Format</label>
          <div className="space-y-2">
            {FORMATS.map(f => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFormat(f.value)}
                className={`w-full text-left rounded-lg border px-4 py-3 transition-colors ${
                  format === f.value
                    ? 'border-ois-primary bg-ois-primary-pale/40'
                    : 'border-ois-border bg-white hover:bg-ois-bg'
                }`}
              >
                <p className="text-sm font-bold text-ois-text">{f.label}</p>
                <p className="text-xs text-ois-text-muted mt-0.5">{f.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-ois-border">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleExport} className="gap-2">
            <Download size={14} /> Export
          </Button>
        </div>
      </div>
    </Modal>
  );
};
