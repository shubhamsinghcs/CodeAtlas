import * as path from 'path';

export class DependencyResolver {
  private fileSet: Set<string>;
  private repoRoot: string;

  constructor(repoRoot: string, allFiles: string[]) {
    this.repoRoot = repoRoot;
    // Normalize paths to forward slashes for consistent lookups
    this.fileSet = new Set(allFiles.map((f) => this.normalizePath(f)));
  }

  private normalizePath(p: string): string {
    return path.normalize(p).replace(/\\/g, '/');
  }

  /**
   * Resolves an import source string to an absolute file path that exists in the repo.
   */
  public resolve(sourceFilePath: string, importSource: string): string | null {
    const normSourceFilePath = this.normalizePath(sourceFilePath);
    const ext = path.extname(normSourceFilePath);

    const isPython = ext === '.py';
    const isTsJs = ['.ts', '.tsx', '.js', '.jsx'].includes(ext);

    if (isTsJs) {
      return this.resolveTsJs(normSourceFilePath, importSource);
    } else if (isPython) {
      return this.resolvePython(normSourceFilePath, importSource);
    }

    // Fallback exact match
    return this.checkCandidates([importSource]) ? importSource : null;
  }

  private resolveTsJs(sourceFilePath: string, importSource: string): string | null {
    if (!importSource.startsWith('.')) {
      // For non-relative imports (e.g. 'react', '@codeatlas/shared'),
      // we only resolve if there's an exact match in the workspace (monorepo basic support).
      // A more complex resolution would require tsconfig parsing.
      return null;
    }

    const dir = path.dirname(sourceFilePath);
    let baseResolve = path.resolve(dir, importSource);
    
    // Path traversal check
    if (!baseResolve.startsWith(this.repoRoot)) return null;

    baseResolve = this.normalizePath(baseResolve);

    const candidates = [
      baseResolve,
      `${baseResolve}.ts`,
      `${baseResolve}.tsx`,
      `${baseResolve}.js`,
      `${baseResolve}.jsx`,
      `${baseResolve}/index.ts`,
      `${baseResolve}/index.tsx`,
      `${baseResolve}/index.js`,
      `${baseResolve}/index.jsx`,
    ];

    return this.checkCandidates(candidates);
  }

  private resolvePython(sourceFilePath: string, importSource: string): string | null {
    // Python imports: `import foo.bar` -> source="foo.bar"
    // `from .foo import bar` -> source=".foo"

    // Check if relative
    let baseResolve: string;
    if (importSource.startsWith('.')) {
      let up = 0;
      for (let i = 0; i < importSource.length; i++) {
        if (importSource[i] === '.') up++;
        else break;
      }
      let dir = path.dirname(sourceFilePath);
      for (let k = 1; k < up; k++) {
        dir = path.dirname(dir);
      }
      const remaining = importSource.substring(up).replace(/\./g, '/');
      baseResolve = this.normalizePath(path.join(dir, remaining));
    } else {
      // Absolute to repo root
      const p = importSource.replace(/\./g, '/');
      const absResolve = path.join(this.repoRoot, p);
      if (!absResolve.startsWith(this.repoRoot)) return null;
      baseResolve = this.normalizePath(absResolve);
    }

    const candidates = [`${baseResolve}.py`, `${baseResolve}/__init__.py`];

    // Try resolving relative to repo root if not found (standard python behavior)
    if (!importSource.startsWith('.')) {
      // In python, the source file's directory is also in sys.path
      const localResolve = this.normalizePath(
        path.join(path.dirname(sourceFilePath), importSource.replace(/\./g, '/')),
      );
      candidates.push(`${localResolve}.py`);
      candidates.push(`${localResolve}/__init__.py`);
    }

    return this.checkCandidates(candidates);
  }

  private checkCandidates(candidates: string[]): string | null {
    for (const c of candidates) {
      if (this.fileSet.has(c)) {
        return c;
      }
    }
    return null;
  }
}
