import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Loader, ErrorMessage, Card, EmptyState } from '../components/ui';

export function Overview() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['repository'],
    queryFn: async () => {
      const res = await fetch('/api/repository');
      if (!res.ok) throw new Error('Failed to fetch repository data');
      return res.json();
    }
  });

  const { data: graphData } = useQuery({
    queryKey: ['graph'],
    queryFn: async () => {
      const res = await fetch('/api/graph');
      if (!res.ok) throw new Error('Failed to fetch graph data');
      return res.json();
    }
  });

  if (isLoading) return <Loader text="Loading repository overview..." />;
  if (error) return <ErrorMessage error={error as Error} />;
  if (!data?.repository) return <EmptyState title="No Repository" description="No repository found. Run 'codeatlas analyze' in your terminal." />;

  const { repository, commit } = data;
  const totalFiles = graphData?.nodes?.length || 0;
  const totalDependencies = graphData?.edges?.length || 0;

  return (
    <div className="page-container">
      <header className="page-header">
        <h1 className="page-title">{repository.name}</h1>
        <p className="page-subtitle">Commit: {commit?.hash || 'Unknown'} • Analyzed: {new Date(repository.createdAt).toLocaleString()}</p>
      </header>

      <div className="stat-grid">
        <Card title="Total Files">
          <div className="stat-value">{totalFiles}</div>
        </Card>
        <Card title="Dependencies">
          <div className="stat-value">{totalDependencies}</div>
        </Card>
      </div>

      <Card title="Quick Actions">
        <div className="flex gap-4 mt-4">
          <Link to="/files" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors">Browse Files</Link>
          <Link to="/risks" className="px-4 py-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-500/20 rounded-md transition-colors">Review Risks</Link>
          <Link to="/graph" className="px-4 py-2 bg-blue-900/20 hover:bg-blue-900/40 text-blue-400 border border-blue-500/20 rounded-md transition-colors">Explore Architecture</Link>
        </div>
      </Card>
    </div>
  );
}
