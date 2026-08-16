import { NavLink, Outlet } from 'react-router-dom';
import { Activity, FileCode2, Network, ShieldAlert, Search, LayoutDashboard, BrainCircuit, ShieldCheck, Layers } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from './ui';

export function Layout() {
  const [aiActive, setAiActive] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/repository')
      .then(res => res.json())
      .then(data => {
        if (data && data.aiActive) {
          setAiActive(true);
        }
      })
      .catch(console.error);
  }, []);

  return (
    <div className="app-container">
      <aside className="sidebar flex flex-col justify-between">
        <div>
          <div className="sidebar-header">
            <Activity size={20} className="text-accent" />
            <span>CodeAtlas</span>
          </div>
          <nav className="sidebar-nav">
            <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
              <LayoutDashboard size={18} />
              Overview
            </NavLink>
            <NavLink to="/architecture" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Layers size={18} />
              Architecture
            </NavLink>
            <NavLink to="/files" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <FileCode2 size={18} />
              Files
            </NavLink>
            <NavLink to="/risks" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <ShieldAlert size={18} />
              Risks
            </NavLink>
            <NavLink to="/graph" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Network size={18} />
              Graph
            </NavLink>
            <NavLink to="/impact" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Activity size={18} />
              Impact
            </NavLink>
            <NavLink to="/search" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Search size={18} />
              Search
            </NavLink>
          </nav>
        </div>
        
        <div className="p-4 border-t border-slate-800">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Engine</span>
              {aiActive ? (
                <Badge variant="ai"><BrainCircuit size={12} className="mr-1"/> AI Active</Badge>
              ) : (
                <Badge variant="neutral"><ShieldCheck size={12} className="mr-1"/> Local</Badge>
              )}
            </div>
            <div className="text-[11px] text-slate-500 leading-tight">
              {aiActive 
                ? "CodeAtlas AI features enabled. Source code is never uploaded, only structural metadata." 
                : "CodeAtlas is running entirely locally using static AST analysis."}
            </div>
          </div>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
