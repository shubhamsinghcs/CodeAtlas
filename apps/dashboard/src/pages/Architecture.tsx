import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ReactFlow, Controls, Background, useNodesState, useEdgesState, useReactFlow, ReactFlowProvider, Node, Edge } from '@xyflow/react';
import dagre from 'dagre';
import '@xyflow/react/dist/style.css';
import { Loader, ErrorMessage, Badge } from '../components/ui';
import { FileCode, Box } from 'lucide-react';
import { Link } from 'react-router-dom';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

function getLayoutedElements(nodes: Node[], edges: Edge[], direction = 'TB') {
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 220, height: 60 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const newNode = { ...node };

    newNode.position = {
      x: nodeWithPosition.x - 220 / 2,
      y: nodeWithPosition.y - 60 / 2,
    };

    return newNode;
  });

  return { nodes: newNodes, edges };
}

function ArchitectureInner() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['architecture'],
    queryFn: async () => {
      const res = await fetch('/api/architecture');
      if (!res.ok) throw new Error('Failed to fetch architecture data');
      return res.json();
    }
  });

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  
  const [selectedModule, setSelectedModule] = useState<{ name: string; files: string[] } | null>(null);
  
  const { fitView } = useReactFlow();

  useEffect(() => {
    if (data && nodes.length === 0) {
      const initialNodes = data.modules.map((m: { name: string; files: string[] }) => ({
        id: m.name,
        data: { label: m.name, count: m.files.length },
        style: {
          background: 'var(--bg-card)',
          color: 'var(--text-main)',
          border: '2px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          fontSize: '14px',
          fontWeight: 600,
          padding: '10px',
          width: 220,
          textAlign: 'center',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
        }
      }));

      const initialEdges = data.edges.map((e: { source: string; target: string }, i: number) => ({
        id: `e${i}`,
        source: e.source,
        target: e.target,
        animated: true,
        style: { stroke: 'var(--text-muted)', strokeWidth: 2 }
      }));

      const layouted = getLayoutedElements(initialNodes, initialEdges, 'LR');
      setNodes(layouted.nodes);
      setEdges(layouted.edges);
      
      setTimeout(() => fitView({ padding: 0.2 }), 100);
    }
  }, [data]);

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    const mod = data?.modules.find((m: { name: string; files: string[] }) => m.name === node.id);
    if (mod) setSelectedModule(mod);
  }, [data]);

  if (isLoading) return <Loader text="Mapping architectural layers..." />;
  if (error) return <ErrorMessage error={error as Error} />;

  return (
    <div className="architecture-layout" style={{ width: '100%', height: '100%', display: 'flex', position: 'relative' }}>
      
      {/* Module Graph View */}
      <div className="architecture-graph" style={{ flex: selectedModule ? '1 1 60%' : '1', minWidth: '300px', transition: 'flex 0.3s ease', position: 'relative' }}>
        <header className="page-header" style={{ padding: 'var(--spacing-xl)', position: 'absolute', zIndex: 10, pointerEvents: 'none' }}>
          <h1 className="page-title">Architecture Layers</h1>
          <p className="page-subtitle" style={{ pointerEvents: 'auto', background: 'var(--bg-color)', padding: '0.2rem 0.5rem', borderRadius: '4px', display: 'inline-block' }}>
            Repository ➔ Module ➔ File ➔ Symbol
          </p>
        </header>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          onPaneClick={() => setSelectedModule(null)}
          fitView
          colorMode="dark"
          minZoom={0.1}
        >
          <Background color="var(--border-color)" gap={16} />
          <Controls />
        </ReactFlow>
      </div>

      {/* Module Drill Down Panel */}
      {selectedModule && (
        <div className="architecture-sidebar" style={{ flex: '1 1 40%', minWidth: '300px', borderLeft: '1px solid var(--border-color)', backgroundColor: 'var(--bg-sidebar)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 'var(--spacing-xl)', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Box className="text-accent" size={24} />
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{selectedModule.name}</h2>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Badge variant="neutral">{selectedModule.files.length} Files</Badge>
              <Badge variant="neutral">Module Layer</Badge>
            </div>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--spacing-xl)' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>Files in Module</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {selectedModule.files.map((file) => (
                <Link 
                  key={file} 
                  to={`/files/${file}`}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.75rem', 
                    padding: '0.75rem', 
                    backgroundColor: 'var(--bg-card)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: 'var(--radius-sm)',
                    textDecoration: 'none',
                    color: 'var(--text-main)',
                    transition: 'border-color 0.2s'
                  }}
                  className="hover-card"
                >
                  <FileCode size={18} className="text-muted" />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', wordBreak: 'break-all' }}>
                    {file}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function Architecture() {
  return (
    <ReactFlowProvider>
      <ArchitectureInner />
    </ReactFlowProvider>
  );
}
