import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader, ErrorMessage, Card, Badge } from '../components/ui';

export function ImpactAnalysis() {
  const [searchParams] = useSearchParams();
  const fileQuery = searchParams.get('file') || '';
  const [targetFile, setTargetFile] = useState(fileQuery);
  const navigate = useNavigate();

  useEffect(() => {
    if (fileQuery) setTargetFile(fileQuery);
  }, [fileQuery]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['impact', targetFile],
    queryFn: async () => {
      if (!targetFile) return null;
      const res = await fetch(`/api/impact/${encodeURIComponent(targetFile)}`);
      if (!res.ok) throw new Error('Failed to fetch impact analysis');
      return res.json();
    },
    enabled: !!targetFile,
  });

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetFile) {
      navigate(`/impact?file=${encodeURIComponent(targetFile)}`);
      refetch();
    }
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <h1 className="page-title">Impact Analysis</h1>
        <p className="page-subtitle">Determine the blast radius of a code change</p>
      </header>

      <Card title="Target File">
        <form onSubmit={handleAnalyze} style={{ display: 'flex', gap: '1rem' }}>
          <input 
            type="text" 
            className="input" 
            placeholder="e.g. src/services/userService.ts" 
            value={targetFile}
            onChange={(e) => setTargetFile(e.target.value)}
          />
          <button 
            type="submit" 
            style={{ padding: '0 1.5rem', backgroundColor: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)' }}>
            Analyze
          </button>
        </form>
      </Card>

      <div style={{ marginTop: '2rem' }}>
        {isLoading && <Loader text="Calculating impact..." />}
        {error && <ErrorMessage error={error as Error} />}
        
        {!isLoading && !error && data && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <Card title="Impact">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <span className="stat-value">{data.risk.score}</span>
                <Badge variant={data.risk.level === 'High Risk' ? 'danger' : data.risk.level === 'Medium Risk' ? 'warning' : 'success'}>
                  {data.risk.level.toUpperCase()}
                </Badge>
              </div>
              
              <div style={{ marginTop: '1rem' }}>
                <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Why:</p>
                <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-muted)' }}>
                  {data.directDependents.length > 0 && <li>{data.directDependents.length} files directly depend on this module.</li>}
                  {data.indirectDependents.length > 0 && <li>{data.indirectDependents.length} files indirectly depend on this file.</li>}
                  {data.apiRoutes.length > 0 && <li>{data.apiRoutes.length} API routes depend on it.</li>}
                  {data.relatedTests.length > 0 && <li>{data.relatedTests.length} test suites cover related behavior.</li>}
                  {data.architecturalModule && <li>Module belongs to {data.architecturalModule} architecture area.</li>}
                  {data.risk.factors.map((f: { name: string; description: string; contribution: number }, i: number) => (
                    <li key={i}>{f.name} detected.</li>
                  ))}
                </ul>
              </div>
            </Card>

            <Card title={`Potentially affected (${data.potentiallyAffectedFiles.length})`}>
              <ul style={{ paddingLeft: '1.5rem' }}>
                {data.potentiallyAffectedFiles.map((d: { filePath: string; explanation?: string }, i: number) => (
                  <li key={i} style={{ marginBottom: '0.8rem' }}>
                    <div style={{ fontFamily: 'var(--font-mono)' }}>{d.filePath}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85em', marginTop: '0.2rem' }}>Reason: {d.explanation}</div>
                  </li>
                ))}
                {data.potentiallyAffectedFiles.length === 0 && <span style={{ color: 'var(--text-muted)' }}>None</span>}
              </ul>
            </Card>

            <Card title={`Tests (${data.relatedTests.length})`}>
              <ul style={{ paddingLeft: '1.5rem' }}>
                {data.relatedTests.map((d: { filePath: string }, i: number) => (
                  <li key={i} style={{ marginBottom: '0.5rem', fontFamily: 'var(--font-mono)' }}>{d.filePath}</li>
                ))}
                {data.relatedTests.length === 0 && <span style={{ color: 'var(--text-muted)' }}>None</span>}
              </ul>
            </Card>

            <Card title="Recommended inspection order">
              <ol style={{ paddingLeft: '1.5rem', fontFamily: 'var(--font-mono)' }}>
                <li style={{ marginBottom: '0.5rem' }}>{data.targetFilePath}</li>
                {data.recommendedInspectionOrder.map((d: { filePath: string }, i: number) => (
                  <li key={i} style={{ marginBottom: '0.5rem' }}>{d.filePath}</li>
                ))}
              </ol>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
