import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Loader, ErrorMessage, EmptyState, Badge } from '../components/ui';

export function Risks() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['risks'],
    queryFn: async () => {
      const res = await fetch('/api/risks');
      if (!res.ok) throw new Error('Failed to fetch risks');
      return res.json();
    }
  });

  if (isLoading) return <Loader text="Loading risk analysis..." />;
  if (error) return <ErrorMessage error={error as Error} />;
  
  const files = data?.files || [];

  const renderFiles = files.map((f: { id: string; path: string; lines: number; riskScore?: number; riskLevel?: string }) => ({
    ...f,
    riskLevel: f.riskLevel || 'Unknown',
    riskScore: f.riskScore || 0
  })).sort((a: { lines: number }, b: { lines: number }) => b.lines - a.lines);

  return (
    <div className="page-container">
      <header className="page-header">
        <h1 className="page-title">Architectural Risks</h1>
        <p className="page-subtitle">Identify files that need refactoring or testing</p>
      </header>

      {renderFiles.length === 0 ? (
        <EmptyState title="No files analyzed" />
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Path</th>
                <th>Lines</th>
                <th>Score</th>
                <th>Level</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {renderFiles.map((file: { id: string; path: string; riskLevel: string; riskScore: number; lines: number }) => (
                <tr key={file.id}>
                  <td>
                    <Link to={`/files/${file.path}`} className="font-mono">
                      {file.path}
                    </Link>
                  </td>
                  <td>{file.lines}</td>
                  <td>{file.riskScore}</td>
                  <td>
                    <Badge variant={file.riskLevel === 'High Risk' ? 'danger' : file.riskLevel === 'Medium Risk' ? 'warning' : file.riskLevel === 'Low Risk' ? 'success' : 'neutral'}>
                      {file.riskLevel}
                    </Badge>
                  </td>
                  <td>
                    <Link to={`/impact?file=${file.path}`} style={{ color: 'var(--accent-color)' }}>Analyze Impact</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
