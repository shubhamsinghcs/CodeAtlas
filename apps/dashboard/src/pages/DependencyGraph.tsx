import { useEffect, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ReactFlow, Controls, Background, useNodesState, useEdgesState, useReactFlow, ReactFlowProvider, Node, Edge } from '@xyflow/react';
import dagre from 'dagre';
import '@xyflow/react/dist/style.css';
import { Loader, ErrorMessage } from '../components/ui';
import { ImpactPanel } from '../components/ImpactPanel';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

function getLayoutedElements(nodes: Node[], edges: Edge[], direction = 'TB') {
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    // Approximate node dimensions
    dagreGraph.setNode(node.id, { width: 180, height: 40 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const newNode = { ...node };

    newNode.position = {
      x: nodeWithPosition.x - 180 / 2,
      y: nodeWithPosition.y - 40 / 2,
    };

    return newNode;
  });

  return { nodes: newNodes, edges };
}

function DependencyGraphInner() {
  const { data: graphData, isLoading: isLoadingGraph, error: graphError } = useQuery({
    queryKey: ['graph'],
    queryFn: async () => {
      const res = await fetch('/api/graph');
      if (!res.ok) throw new Error('Failed to fetch graph data');
      return res.json();
    }
  });

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedNode, setSelectedNode] = useState<{id: string, label: string} | null>(null);
  const [isFocusMode, setIsFocusMode] = useState(false);
  
  const { fitView } = useReactFlow();

  // Fetch impact data when a node is selected
  const { data: impactData, isLoading: isLoadingImpact } = useQuery({
    queryKey: ['impact', selectedNode?.label],
    queryFn: async () => {
      if (!selectedNode) return null;
      const res = await fetch(`/api/impact/${encodeURIComponent(selectedNode.label)}`);
      if (!res.ok) throw new Error('Failed to fetch impact analysis');
      return res.json();
    },
    enabled: !!selectedNode,
  });

  // Initial layout initialization
  useEffect(() => {
    if (graphData && nodes.length === 0) {
      const initialNodes = graphData.nodes.map((n: { id: string; label: string }) => ({
        id: n.id,
        data: { label: n.label.split('/').pop(), fullPath: n.label },
        style: {
          background: 'var(--bg-card)',
          color: 'var(--text-main)',
          border: '1px solid var(--border-color)',
          fontSize: '12px',
          fontFamily: 'var(--font-mono)',
          padding: '8px',
          width: 180,
          textAlign: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }
      }));

      const initialEdges = graphData.edges.map((e: { source: string; target: string }, i: number) => ({
        id: `e${i}`,
        source: e.source,
        target: e.target,
        animated: false,
        style: { stroke: 'var(--text-muted)', strokeWidth: 1 }
      }));

      const layouted = getLayoutedElements(initialNodes, initialEdges, 'LR');
      setNodes(layouted.nodes);
      setEdges(layouted.edges);
      
      setTimeout(() => fitView({ padding: 0.2 }), 100);
    }
  }, [graphData]);

  // Apply node styles based on selection, impact, and focus mode
  useEffect(() => {
    if (!graphData) return;

    if (!selectedNode) {
      // Reset all
      setNodes(nds => nds.map(n => ({
        ...n,
        className: '',
        hidden: false
      })));
      setEdges(eds => eds.map(e => ({
        ...e,
        className: '',
        animated: false,
        hidden: false
      })));
      return;
    }

    // Determine affected nodes from impactData
    const affectedPaths = new Set<string>();
    if (impactData) {
      impactData.directDependents.forEach((d: { filePath: string }) => affectedPaths.add(d.filePath));
      impactData.transitiveDependents.forEach((d: { filePath: string }) => affectedPaths.add(d.filePath));
      impactData.directDependencies.forEach((d: { filePath: string }) => affectedPaths.add(d.filePath));
    }
    
    // Add the target itself
    affectedPaths.add(selectedNode.label);

    const affectedNodeIds = new Set(
      graphData.nodes
        .filter((n: { label: string }) => affectedPaths.has(n.label))
        .map((n: { id: string }) => n.id)
    );

    setNodes(nds => nds.map(n => {
      const isTarget = n.id === selectedNode.id;
      const isAffected = affectedNodeIds.has(n.id);
      
      let className = '';
      if (isTarget) className = 'node-highlighted';
      else if (!isAffected) className = 'node-dimmed';
      
      const hidden = isFocusMode && !isAffected;
      
      if (n.className === className && n.hidden === hidden) {
        return n; // skip re-render
      }
      return {
        ...n,
        className,
        hidden
      };
    }));

    setEdges(eds => eds.map(e => {
      const isAffectedEdge = affectedNodeIds.has(e.source) && affectedNodeIds.has(e.target);
      
      let className = isAffectedEdge ? 'edge-highlighted edge-animated' : 'edge-dimmed';
      let animated = isAffectedEdge;
      const hidden = isFocusMode && !isAffectedEdge;

      if (e.className === className && e.animated === animated && e.hidden === hidden) {
        return e;
      }
      return {
        ...e,
        className,
        animated,
        hidden
      };
    }));

  }, [selectedNode, impactData, isFocusMode, graphData]);

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode({ id: node.id, label: node.data.fullPath as string });
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    
    const node = nodes.find(n => (n.data?.fullPath as string)?.toLowerCase().includes(searchQuery.toLowerCase()));
    if (node) {
      setSelectedNode({ id: node.id, label: node.data.fullPath as string });
      fitView({ nodes: [node], duration: 800, maxZoom: 1 });
    }
  };

  if (isLoadingGraph) return <Loader text="Computing architectural layout..." />;
  if (graphError) return <ErrorMessage error={graphError as Error} />;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <header className="page-header" style={{ padding: 'var(--spacing-xl)', paddingBottom: 0, position: 'absolute', zIndex: 10, pointerEvents: 'none' }}>
        <h1 className="page-title">Dependency Graph</h1>
        <p className="page-subtitle" style={{ pointerEvents: 'auto', background: 'var(--bg-color)', padding: '0.2rem 0.5rem', borderRadius: '4px', display: 'inline-block' }}>
          Explore the "What changes if I edit this file?" workflow.
        </p>
      </header>

      {/* Floating Toolbar */}
      <div style={{ position: 'absolute', top: 'var(--spacing-xl)', left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', gap: '1rem' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex' }}>
          <input 
            type="text" 
            className="input" 
            placeholder="Search files..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', maxWidth: '300px', borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
          />
          <button type="submit" style={{ padding: '0 1rem', background: 'var(--bg-sidebar)', border: '1px solid var(--border-color)', borderLeft: 'none', borderTopRightRadius: 'var(--radius-md)', borderBottomRightRadius: 'var(--radius-md)', color: 'var(--text-main)' }}>Find</button>
        </form>

        {selectedNode && (
          <button 
            onClick={() => setIsFocusMode(!isFocusMode)}
            style={{ padding: '0 1rem', background: isFocusMode ? 'var(--accent-color)' : 'var(--bg-sidebar)', color: isFocusMode ? 'white' : 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}
          >
            {isFocusMode ? 'Show Full Graph' : 'Focus Blast Radius'}
          </button>
        )}
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          onPaneClick={() => setSelectedNode(null)}
          fitView
          colorMode="dark"
          minZoom={0.1}
        >
          <Background color="var(--border-color)" gap={16} />
          <Controls />
        </ReactFlow>

        {selectedNode && (
          <ImpactPanel 
            targetNodeId={selectedNode.id}
            targetNodeLabel={selectedNode.label}
            impactData={impactData}
            isLoading={isLoadingImpact}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>
    </div>
  );
}

export function DependencyGraph() {
  return (
    <ReactFlowProvider>
      <DependencyGraphInner />
    </ReactFlowProvider>
  );
}
