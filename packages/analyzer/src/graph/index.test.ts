import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { DependencyResolver } from './resolver';
import { GraphEngine } from './analyzer';
import { DatabaseClient, schema } from '@codeatlas/database';
import { eq } from 'drizzle-orm';

describe('DependencyResolver', () => {
  it('resolves relative typescript imports', () => {
    const root = path.resolve('/repo');
    const allFiles = [
      path.resolve('/repo/src/index.ts'),
      path.resolve('/repo/src/utils/helpers.ts'),
      path.resolve('/repo/src/components/Button.tsx'),
      path.resolve('/repo/src/components/index.ts'),
    ];

    const resolver = new DependencyResolver(root, allFiles);

    // Exact extension
    expect(resolver.resolve(path.resolve('/repo/src/index.ts'), './utils/helpers.ts')).toBe(
      resolver['normalizePath'](path.resolve('/repo/src/utils/helpers.ts')),
    );

    // Missing extension
    expect(resolver.resolve(path.resolve('/repo/src/index.ts'), './utils/helpers')).toBe(
      resolver['normalizePath'](path.resolve('/repo/src/utils/helpers.ts')),
    );

    // Directory index
    expect(resolver.resolve(path.resolve('/repo/src/index.ts'), './components')).toBe(
      resolver['normalizePath'](path.resolve('/repo/src/components/index.ts')),
    );

    // Go up directory
    expect(
      resolver.resolve(path.resolve('/repo/src/components/Button.tsx'), '../utils/helpers'),
    ).toBe(resolver['normalizePath'](path.resolve('/repo/src/utils/helpers.ts')));

    // Unresolved
    expect(resolver.resolve(path.resolve('/repo/src/index.ts'), './missing')).toBeNull();
  });

  it('resolves python module imports', () => {
    const root = path.resolve('/repo');
    const allFiles = [
      path.resolve('/repo/main.py'),
      path.resolve('/repo/utils/math.py'),
      path.resolve('/repo/utils/__init__.py'),
      path.resolve('/repo/core/config.py'),
    ];

    const resolver = new DependencyResolver(root, allFiles);

    // Absolute module resolution from root
    expect(resolver.resolve(path.resolve('/repo/main.py'), 'utils.math')).toBe(
      resolver['normalizePath'](path.resolve('/repo/utils/math.py')),
    );
    expect(resolver.resolve(path.resolve('/repo/main.py'), 'core.config')).toBe(
      resolver['normalizePath'](path.resolve('/repo/core/config.py')),
    );

    // Relative python resolution
    expect(resolver.resolve(path.resolve('/repo/utils/math.py'), '.')).toBe(
      resolver['normalizePath'](path.resolve('/repo/utils/__init__.py')),
    );
  });
});

describe('GraphEngine', () => {
  it('calculates metrics and identifies circular dependencies', () => {
    const engine = new GraphEngine();

    // A -> B -> C -> A
    engine.addEdge('a', 'b');
    engine.addEdge('b', 'c');
    engine.addEdge('c', 'a');

    // D -> B
    engine.addEdge('d', 'b');

    // Direct
    expect(engine.getDirectDependencies('a')).toEqual(['b']);
    expect(engine.getDirectDependents('b')).toContain('a');
    expect(engine.getDirectDependents('b')).toContain('d');

    // Fan in/out
    expect(engine.getFanIn('b')).toBe(2);
    expect(engine.getFanOut('d')).toBe(1);

    // Depth
    expect(engine.getDepth('d')).toBe(4); // d -> b -> c -> a -> (cycle)

    // Circular
    const cycles = engine.getCircularDependencies();
    expect(cycles.length).toBe(1);

    // Cycle should contain a, b, c. It might be rotated, e.g. a -> b -> c -> a
    const cycleStr = cycles[0].join('->');
    expect(cycleStr).toBe('a->b->c->a');
  });
});

describe('Database Integration', () => {
  it('persists graph relationships in sqlite', () => {
    const client = new DatabaseClient(':memory:');
    const migrationsFolder = path.resolve(__dirname, '../../../database/drizzle');
    client.runMigrations(migrationsFolder);

    const { db } = client;

    // Create repo, commit, run
    db.insert(schema.repositories)
      .values({
        id: 'r1',
        name: 'repo',
        pathOrUrl: '/tmp/repo',
        type: 'local',
        createdAt: new Date(),
      })
      .run();
    db.insert(schema.commits).values({ id: 'c1', repositoryId: 'r1', hash: 'abc' }).run();
    db.insert(schema.analysisRuns)
      .values({
        id: 'run1',
        repositoryId: 'r1',
        commitId: 'c1',
        status: 'completed',
        startedAt: new Date(),
      })
      .run();

    // Create files
    db.insert(schema.files)
      .values({ id: 'fileA', runId: 'run1', path: 'a.ts', language: 'ts', size: 10, lines: 1 })
      .run();
    db.insert(schema.files)
      .values({ id: 'fileB', runId: 'run1', path: 'b.ts', language: 'ts', size: 10, lines: 1 })
      .run();

    // Create import from fileA -> fileB
    db.insert(schema.imports)
      .values({
        id: 'imp1',
        fileId: 'fileA',
        source: './b',
        startLine: 1,
        endLine: 1,
        resolvedFileId: 'fileB',
      })
      .run();

    const result = db.select().from(schema.imports).where(eq(schema.imports.id, 'imp1')).all();
    expect(result).toHaveLength(1);
    expect(result[0].resolvedFileId).toBe('fileB');
  });
});
