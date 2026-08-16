import { describe, it, expect } from 'vitest';
import { inferArchitecture, buildModuleGraph } from './architecture';

describe('Architecture Inference', () => {
  it('detects monorepo workspaces and groups them', () => {
    const paths = [
      'packages/analyzer/src/index.ts',
      'packages/analyzer/src/ast/index.ts',
      'packages/cli/src/index.ts',
      'apps/dashboard/src/App.tsx',
      'package.json'
    ];

    const modules = inferArchitecture(paths);
    
    expect(modules).toHaveLength(4); // analyzer, cli, dashboard, root
    
    const analyzer = modules.find(m => m.name === 'packages/analyzer');
    expect(analyzer?.files).toHaveLength(2);

    const root = modules.find(m => m.name === 'Root/Other');
    expect(root?.files).toContain('package.json');
  });

  it('groups standard repo by src subdirectories', () => {
    const paths = [
      'src/auth/session.ts',
      'src/auth/token.ts',
      'src/services/api.ts',
      'README.md'
    ];

    const modules = inferArchitecture(paths);

    expect(modules).toHaveLength(3); // src/auth, src/services, Root Files
    
    const auth = modules.find(m => m.name === 'src/auth');
    expect(auth?.files).toHaveLength(2);
    expect(auth?.files).toContain('src/auth/session.ts');

    const root = modules.find(m => m.name === 'Root Files');
    expect(root?.files).toContain('README.md');
  });

  it('builds module level graph correctly', () => {
    const modules = [
      { name: 'apps/dashboard', files: ['apps/dashboard/index.ts'] },
      { name: 'packages/cli', files: ['packages/cli/index.ts', 'packages/cli/util.ts'] },
      { name: 'packages/analyzer', files: ['packages/analyzer/index.ts'] }
    ];

    const allImports = [
      { fileId: 'f1', resolvedFileId: 'f2' }, // apps/dashboard -> packages/cli
      { fileId: 'f2', resolvedFileId: 'f3' }, // packages/cli -> packages/analyzer
      { fileId: 'f1', resolvedFileId: 'f3' }, // apps/dashboard -> packages/analyzer
      { fileId: 'f2', resolvedFileId: 'f2_2' } // internal cli import
    ];

    const filesMap = new Map([
      ['f1', 'apps/dashboard/index.ts'],
      ['f2', 'packages/cli/index.ts'],
      ['f2_2', 'packages/cli/util.ts'],
      ['f3', 'packages/analyzer/index.ts']
    ]);

    const graph = buildModuleGraph(modules, allImports, filesMap);

    expect(graph.modules).toHaveLength(3);
    expect(graph.edges).toHaveLength(3); // 3 external edges, internal edge is ignored

    expect(graph.edges).toContainEqual({ source: 'apps/dashboard', target: 'packages/cli' });
    expect(graph.edges).toContainEqual({ source: 'packages/cli', target: 'packages/analyzer' });
    expect(graph.edges).toContainEqual({ source: 'apps/dashboard', target: 'packages/analyzer' });
  });
});
