import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Overview } from './pages/Overview';
import { Files } from './pages/Files';
import { FileDetails } from './pages/FileDetails';
import { Architecture } from './pages/Architecture';
import { Risks } from './pages/Risks';
import { DependencyGraph } from './pages/DependencyGraph';
import { ImpactAnalysis } from './pages/ImpactAnalysis';
import { Search } from './pages/Search';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Overview />} />
        <Route path="architecture" element={<Architecture />} />
        <Route path="files" element={<Files />} />
        <Route path="files/:path/*" element={<FileDetails />} />
        <Route path="risks" element={<Risks />} />
        <Route path="graph" element={<DependencyGraph />} />
        <Route path="impact" element={<ImpactAnalysis />} />
        <Route path="search" element={<Search />} />
      </Route>
    </Routes>
  );
}

export default App;
