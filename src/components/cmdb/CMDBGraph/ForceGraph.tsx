import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { ConfigurationItem, CIRelationship, CIType, RelationshipType } from '../../../types/ci';
import { ciTypeMeta, relationshipTypeMeta } from '../../../lib/constants';

interface Node extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  type: CIType;
  publicId: string;
  health: string;
  criticality: string;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
  type: string;
}

interface ForceGraphProps {
  nodes: ConfigurationItem[];
  links: CIRelationship[];
  onNodeClick?: (ci: ConfigurationItem) => void;
  focusedId?: string | null;
}

export const ForceGraph: React.FC<ForceGraphProps> = ({ 
  nodes: ciNodes, 
  links: ciLinks,
  onNodeClick,
  focusedId
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Prepare data for D3
  const data = useMemo(() => {
    const nodes: Node[] = ciNodes.map(ci => ({
      id: ci.id,
      name: ci.name,
      type: ci.type,
      publicId: ci.publicId,
      health: ci.health,
      criticality: ci.criticality
    }));

    const links: Link[] = ciLinks.map(rel => ({
      source: rel.fromCiId,
      target: rel.toCiId,
      type: rel.type
    })).filter(l => 
      nodes.some(n => n.id === l.source) && 
      nodes.some(n => n.id === l.target)
    );

    return { nodes, links };
  }, [ciNodes, ciLinks]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height] as any);

    svg.selectAll('*').remove();

    const g = svg.append('g');

    // Zoom setup
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Simulation setup
    const simulation = d3.forceSimulation<Node>(data.nodes)
      .force('link', d3.forceLink<Node, Link>(data.links).id(d => d.id).distance(150))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(50));

    // Arrow marker
    svg.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 22) // Offset from node
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('xoverflow', 'visible')
      .append('svg:path')
      .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
      .attr('fill', '#999')
      .style('stroke', 'none');

    // Draw links
    const link = g.append('g')
      .attr('stroke-opacity', 0.6)
      .selectAll('line')
      .data(data.links)
      .join('line')
      .attr('stroke', (d: any) => (relationshipTypeMeta[d.type as RelationshipType]?.color || '#999'))
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', (d: any) => relationshipTypeMeta[d.type as RelationshipType]?.lineStyle === 'dashed' ? '4,4' : 'none')
      .attr('marker-end', 'url(#arrowhead)');

    // Draw nodes
    const node = g.append('g')
      .selectAll('g')
      .data(data.nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .on('click', (event, d: Node) => {
        const found = ciNodes.find(ci => ci.id === d.id);
        if (found && onNodeClick) onNodeClick(found);
      })
      .call(d3.drag<any, any>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any);

    // Node circles
    node.append('circle')
      .attr('r', (d: Node) => d.criticality === 'critical' ? 24 : d.criticality === 'high' ? 20 : 16)
      .attr('fill', (d: Node) => ciTypeMeta[d.type]?.bg || '#fff')
      .attr('stroke', (d: Node) => ciTypeMeta[d.type]?.color || '#999')
      .attr('stroke-width', (d: Node) => d.id === focusedId ? 4 : 2)
      .attr('class', (d: Node) => d.id === focusedId ? 'animate-pulse' : '');

    // Health indicator sub-circle
    node.append('circle')
      .attr('r', 5)
      .attr('cx', 12)
      .attr('cy', -12)
      .attr('fill', (d: Node) => {
        if (d.health === 'operational') return '#12B76A';
        if (d.health === 'degraded' || d.health === 'partial_outage') return '#F79009';
        if (d.health === 'major_outage') return '#F04438';
        return '#98A2B3';
      });

    // Labels
    node.append('text')
      .attr('dy', 30) // Positioned below node
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .attr('fill', '#101828')
      .text((d: Node) => d.name);

    node.append('text')
      .attr('dy', 42)
      .attr('text-anchor', 'middle')
      .attr('font-size', '8px')
      .attr('font-family', 'JetBrains Mono')
      .attr('fill', '#667085')
      .text((d: Node) => d.publicId);

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => (d.source as Node).x!)
        .attr('y1', (d: any) => (d.source as Node).y!)
        .attr('x2', (d: any) => (d.target as Node).x!)
        .attr('y2', (d: any) => (d.target as Node).y!);

      node
        .attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [data, focusedId, ciNodes, onNodeClick]);

  return (
    <div ref={containerRef} className="w-full h-full bg-slate-50 relative overflow-hidden">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
};
