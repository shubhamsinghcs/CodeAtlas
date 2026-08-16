import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Loader, ErrorMessage, Card, Badge } from '../components/ui';

export function Search() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Basic debounce
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(handler);
  }, [query]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery) return null;
      const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
      if (!res.ok) throw new Error('Search failed');
      return res.json();
    },
    enabled: debouncedQuery.length > 2,
  });

  return (
    <div className="page-container">
      <header className="page-header">
        <h1 className="page-title">Search</h1>
        <p className="page-subtitle">Search for files or specific symbols (functions, classes)</p>
      </header>

      <Card title="Search Query">
        <input 
          type="text" 
          className="input" 
          placeholder="e.g. UserService, util.ts..." 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </Card>

      <div style={{ marginTop: '2rem' }}>
        {debouncedQuery.length > 0 && debouncedQuery.length <= 2 && (
          <p style={{ color: 'var(--text-muted)' }}>Type at least 3 characters to search...</p>
        )}
        
        {isLoading && <Loader text="Searching..." />}
        {error && <ErrorMessage error={error as Error} />}

        {!isLoading && !error && data && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {data.files.length > 0 && (
              <div>
                <h3 style={{ marginBottom: '1rem' }}>Matching Files ({data.files.length})</h3>
                <div className="table-container">
                  <table>
                    <tbody>
                      {data.files.map((file: { id: string; path: string }) => (
                        <tr key={file.id}>
                          <td>
                            <Link to={`/files/${file.path}`} className="font-mono">
                              {file.path}
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {data.symbols.length > 0 && (
              <div>
                <h3 style={{ marginBottom: '1rem' }}>Matching Symbols ({data.symbols.length})</h3>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Exported</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.symbols.map((sym: { id: string; name: string; kind: string; type: string; isExported: boolean; filePath: string }) => (
                        <tr key={sym.id}>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>{sym.name}</td>
                          <td><Badge>{sym.type}</Badge></td>
                          <td>{sym.isExported ? <Badge variant="success">Yes</Badge> : <span style={{color: 'var(--text-muted)'}}>-</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {data.files.length === 0 && data.symbols.length === 0 && (
              <p style={{ color: 'var(--text-muted)' }}>No matches found for "{debouncedQuery}"</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
