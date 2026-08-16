import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader, ErrorMessage, Badge, Card } from '../components/ui';

export function FileDetails() {
  const { '*': filePath } = useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ['file', filePath],
    queryFn: async () => {
      const res = await fetch(`/api/files/${filePath}`);
      if (!res.ok) throw new Error('Failed to fetch file details');
      return res.json();
    }
  });

  if (isLoading) return <Loader text={`Loading ${filePath}...`} />;
  if (error) return <ErrorMessage error={error as Error} />;
  if (!data || !data.file) return <ErrorMessage error="File not found in database" />;

  const { file, symbols } = data;

  const { data: patternsData, isLoading: isPatternsLoading } = useQuery({
    queryKey: ['patterns', filePath],
    queryFn: async () => {
      const res = await fetch(`/api/patterns?q=${encodeURIComponent(filePath || '')}`);
      if (!res.ok) throw new Error('Failed to fetch patterns');
      return res.json();
    }
  });

  return (
    <div className="page-container">
      <header className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title" style={{ fontFamily: 'var(--font-mono)' }}>{file.path}</h1>
            <p className="page-subtitle">{file.language} • {file.lines} lines • {file.size} bytes</p>
          </div>
          <Link to={`/impact?file=${file.path}`} className="badge" style={{ backgroundColor: 'var(--accent-color)', color: 'white', padding: '0.5rem 1rem' }}>
            Run Impact Analysis
          </Link>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <Card title="Symbols Overview">
          {symbols && symbols.length > 0 ? (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Exported</th>
                    <th>Location</th>
                  </tr>
                </thead>
                <tbody>
                  {symbols.map((sym: { id: string; name: string; kind: string; type: string; isExported: boolean; line: number; startLine?: number; endLine?: number }) => (
                    <tr key={sym.id}>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{sym.name}</td>
                      <td><Badge>{sym.type}</Badge></td>
                      <td>{sym.isExported ? <Badge variant="success">Yes</Badge> : <span style={{color: 'var(--text-muted)'}}>-</span>}</td>
                      <td>L{sym.startLine} - L{sym.endLine}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No AST symbols found for this file.</p>
          )}
        </Card>

        {file.commitCount !== null && file.commitCount !== undefined && (
          <Card title="Historical Activity">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Total Commits</span>
                <strong>{file.commitCount}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Unique Contributors</span>
                <strong>{file.authorCount}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Recent Modifications (30d)</span>
                <strong>{file.recentModifications}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Recent Churn</span>
                <Badge variant={file.churn === 'HIGH' ? 'danger' : file.churn === 'MEDIUM' ? 'warning' : 'success'}>
                  {file.churn || 'LOW'}
                </Badge>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Last Modified</span>
                <strong>{file.lastModified ? new Date(file.lastModified).toLocaleDateString() : 'Unknown'}</strong>
              </div>
            </div>
          </Card>
        )}
      </div>

      {!isPatternsLoading && patternsData?.patterns && patternsData.patterns.length > 0 && (
        <Card title="Existing Patterns">
          <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
            These files share similar structural characteristics to the current file.
          </p>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Path</th>
                  <th>Module</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {patternsData.patterns.map((p: any) => (
                  <tr key={p.filePath}>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      <Link to={`/files/${p.filePath}`} style={{ color: 'var(--accent-color)' }}>
                        {p.filePath}
                      </Link>
                    </td>
                    <td><Badge>{p.architecturalModule}</Badge></td>
                    <td><span style={{ fontSize: '0.9em', color: 'var(--text-muted)' }}>{p.reason}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
