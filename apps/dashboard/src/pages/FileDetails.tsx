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
    </div>
  );
}
