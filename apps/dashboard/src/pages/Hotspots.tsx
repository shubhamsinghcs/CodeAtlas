import { useQuery } from '@tanstack/react-query';
import { Card, Badge } from '../components/ui';
import { Link } from 'react-router-dom';

interface HotspotExplanation {
  factor: string;
  description: string;
}

interface Hotspot {
  fileId: string;
  filePath: string;
  score: number;
  severity: '⚠' | '🔥';
  explanations: HotspotExplanation[];
}

export function Hotspots() {
  const { data, isLoading, error } = useQuery<{ hotspots: Hotspot[] }>({
    queryKey: ['hotspots'],
    queryFn: async () => {
      const res = await fetch('/api/hotspots');
      if (!res.ok) throw new Error('Failed to fetch hotspots');
      return res.json();
    }
  });

  if (isLoading) return <div className="page-container"><p>Loading hotspots...</p></div>;
  if (error) return <div className="page-container"><div className="error">Failed to load hotspots.</div></div>;

  const hotspots = data?.hotspots || [];

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Repository Hotspots</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Architectural hotspots indicate areas of the codebase with high complexity, centrality, or missing tests. 
          These are not necessarily broken, but warrant careful consideration during refactoring.
        </p>
      </header>

      {hotspots.length === 0 ? (
        <Card title="Status">
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>
            No significant architectural hotspots detected!
          </p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {hotspots.map((h) => (
            <Card key={h.fileId} title="">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1.5rem', userSelect: 'none' }}>{h.severity}</span>
                <Link to={`/files/${encodeURIComponent(h.filePath)}`} className="text-link" style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                  {h.filePath}
                </Link>
                <div style={{ marginLeft: 'auto' }}>
                  <Badge variant={h.severity === '🔥' ? 'danger' : 'warning'}>Score: {h.score}</Badge>
                </div>
              </div>
              
              <div style={{ paddingLeft: '2.5rem' }}>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {h.explanations.map((exp, j) => (
                    <li key={j} style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
                      <span style={{ color: 'var(--text-muted)' }}>•</span>
                      <div>
                        <strong>{exp.factor}:</strong> <span style={{ color: 'var(--text-muted)' }}>{exp.description}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
