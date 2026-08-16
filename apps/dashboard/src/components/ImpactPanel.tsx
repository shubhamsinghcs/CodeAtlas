import { X } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ImpactPanelProps {
  targetNodeId: string;
  targetNodeLabel: string;
  impactData: {
    score: number;
    risk?: { score: number; level: string; factors: { name: string; description: string; contribution: number }[] };
    directDependents: { filePath: string }[];
    transitiveDependents: { filePath: string }[];
    directDependencies: { filePath: string }[];
    relatedTests: { filePath: string }[];
  };
  isLoading: boolean;
  onClose: () => void;
}

export function ImpactPanel({ targetNodeLabel, impactData, isLoading, onClose }: ImpactPanelProps) {
  return (
    <div className="impact-panel">
      <div className="impact-panel-header">
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-main)' }}>Impact Analysis</h3>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
            {targetNodeLabel}
          </p>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }}>
          <X size={18} />
        </button>
      </div>

      <div className="impact-panel-content">
        {isLoading ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>Loading impact data...</div>
        ) : !impactData ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>Failed to load impact data.</div>
        ) : (
          <>
            {impactData.risk && (
              <div style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', backgroundColor: 'var(--bg-card)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 600 }}>Risk Score</span>
                  <span style={{ color: impactData.risk.score > 70 ? 'var(--error)' : impactData.risk.score > 40 ? 'var(--warning)' : 'var(--success)' }}>
                    {impactData.risk.score}/100 ({impactData.risk.level})
                  </span>
                </div>
                {impactData.risk.factors.length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>Why is this file risky?</p>
                    <ul style={{ fontSize: '0.85rem', paddingLeft: '1.2rem', margin: 0, color: 'var(--text-muted)' }}>
                      {impactData.risk.factors.map((f, i) => (
                        <li key={i} style={{ marginBottom: '0.2rem' }}>
                          <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>{f.name} (+{f.contribution}):</span> {f.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Direct Dependents ({impactData.directDependents.length})</h4>
              {impactData.directDependents.length > 0 ? (
                <ul style={{ fontSize: '0.8rem', color: 'var(--text-muted)', paddingLeft: '1rem', margin: 0 }}>
                  {impactData.directDependents.slice(0, 5).map((d: { filePath: string }, i: number) => (
                    <li key={i} style={{ fontFamily: 'var(--font-mono)' }}>{d.filePath.split('/').pop()}</li>
                  ))}
                  {impactData.directDependents.length > 5 && <li>...and {impactData.directDependents.length - 5} more</li>}
                </ul>
              ) : (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>None</span>
              )}
            </div>

            <div>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Transitive Ripple ({impactData.transitiveDependents.length})</h4>
              {impactData.transitiveDependents.length > 0 ? (
                <ul style={{ fontSize: '0.8rem', color: 'var(--text-muted)', paddingLeft: '1rem', margin: 0 }}>
                  {impactData.transitiveDependents.slice(0, 5).map((d: { filePath: string }, i: number) => (
                    <li key={i} style={{ fontFamily: 'var(--font-mono)' }}>{d.filePath.split('/').pop()}</li>
                  ))}
                  {impactData.transitiveDependents.length > 5 && <li>...and {impactData.transitiveDependents.length - 5} more</li>}
                </ul>
              ) : (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>None</span>
              )}
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <Link 
                to={`/files/${targetNodeLabel}`} 
                style={{ display: 'block', textAlign: 'center', padding: '0.5rem', backgroundColor: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)' }}>
                View Full File Details
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
