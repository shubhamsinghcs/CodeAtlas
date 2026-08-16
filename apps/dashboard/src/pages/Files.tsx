import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Loader, ErrorMessage, EmptyState } from '../components/ui';

export function Files() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['files'],
    queryFn: async () => {
      const res = await fetch('/api/files');
      if (!res.ok) throw new Error('Failed to fetch files');
      return res.json();
    }
  });

  if (isLoading) return <Loader text="Loading files..." />;
  if (error) return <ErrorMessage error={error as Error} />;
  
  const files = data?.files || [];
  
  return (
    <div className="page-container">
      <header className="page-header">
        <h1 className="page-title">Files</h1>
        <p className="page-subtitle">{files.length} files tracked in repository</p>
      </header>

      {files.length === 0 ? (
        <EmptyState title="No files found" description="Try running an analysis first." />
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Path</th>
                <th>Language</th>
                <th>Lines</th>
                <th>Size (Bytes)</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file: { id: string; path: string; lines: number; language?: string; size?: number }) => (
                <tr key={file.id}>
                  <td>
                    <Link to={`/files/${file.path}`} className="font-mono" style={{ fontFamily: 'var(--font-mono)' }}>
                      {file.path}
                    </Link>
                  </td>
                  <td>{file.language}</td>
                  <td>{file.lines}</td>
                  <td>{file.size}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
