import { Loader2, AlertCircle, FileSearch } from 'lucide-react';

export function Loader({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-slate-400 gap-3 animate-pulse" role="status">
      <Loader2 className="animate-spin text-blue-500" size={28} />
      <span className="font-medium tracking-wide">{text}</span>
    </div>
  );
}

export function ErrorMessage({ error }: { error: Error | string }) {
  const msg = typeof error === 'string' ? error : error.message;
  return (
    <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg shadow-sm" role="alert">
      <AlertCircle size={20} className="shrink-0" />
      <span className="font-medium text-sm">{msg}</span>
    </div>
  );
}

export function EmptyState({ title, description, icon }: { title: string; description?: string, icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center p-16 text-center border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/50">
      <div className="text-slate-500 mb-4">
        {icon || <FileSearch size={48} />}
      </div>
      <h3 className="text-lg font-semibold text-slate-300 mb-2">{title}</h3>
      {description && <p className="text-slate-500 max-w-sm text-sm">{description}</p>}
    </div>
  );
}

export function Card({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm ${className}`}>
      {title && (
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/50">
          <h3 className="font-semibold text-slate-200 tracking-tight">{title}</h3>
        </div>
      )}
      <div className="p-5">
        {children}
      </div>
    </div>
  );
}

export function Badge({ children, variant = 'neutral' }: { children: React.ReactNode; variant?: 'success' | 'warning' | 'danger' | 'neutral' | 'ai' }) {
  const variants = {
    success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    danger: 'bg-red-500/10 text-red-400 border border-red-500/20',
    neutral: 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
    ai: 'bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.1)]',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
}
