import { describe, it, expect, beforeAll } from 'vitest';
import * as path from 'path';
import { DatabaseClient, schema } from '@codeatlas/database';
import { ImpactAnalyzer } from './analyzer';
import { AstEngine } from '../ast';
import { DependencyResolver } from '../graph/resolver';
import * as fs from 'fs';

describe('ImpactAnalyzer Integration', () => {
  let dbClient: DatabaseClient;
  const runId = 'test-run-1';
  const fixturePath = path.resolve(__dirname, '../../__fixtures__/impact');

  beforeAll(() => {
    dbClient = new DatabaseClient(':memory:');
    const migrationsFolder = path.resolve(__dirname, '../../../database/drizzle');
    dbClient.runMigrations(migrationsFolder);

    const { db } = dbClient;

    // 1. Setup DB Repo/Commit
    db.insert(schema.repositories)
      .values({
        id: 'repo1',
        name: 'impact',
        pathOrUrl: fixturePath,
        type: 'local',
        createdAt: new Date(),
      })
      .run();
    db.insert(schema.commits).values({ id: 'commit1', repositoryId: 'repo1', hash: 'abc' }).run();
    db.insert(schema.analysisRuns)
      .values({
        id: runId,
        repositoryId: 'repo1',
        commitId: 'commit1',
        status: 'completed',
        startedAt: new Date(),
      })
      .run();

    // 2. Discover and Parse Files
    const files = ['api.ts', 'controller.ts', 'service.ts', 'utils.ts', 'service.test.ts'];
    const absoluteFiles = files.map((f) => path.join(fixturePath, f));

    const astEngine = new AstEngine();
    const resolver = new DependencyResolver(fixturePath, absoluteFiles);

    // Insert files
    files.forEach((f, index) => {
      const content = fs.readFileSync(path.join(fixturePath, f), 'utf-8');
      const lines = content.split('\n').length;
      db.insert(schema.files)
        .values({
          id: `file_${index}`,
          runId,
          path: f,
          language: 'ts',
          size: Buffer.byteLength(content),
          lines,
        })
        .run();
    });

    // Parse and Insert Imports
    files.forEach((f, sourceIndex) => {
      const absPath = path.join(fixturePath, f);
      const result = astEngine.analyzeFile(absPath, 'ts');

      result.imports.forEach((imp, impIdx) => {
        const resolvedAbs = resolver.resolve(absPath, imp.source);
        let resolvedFileId: string | null = null;

        if (resolvedAbs) {
          const resolvedRel = path.relative(fixturePath, resolvedAbs).replace(/\\/g, '/');
          const targetIndex = files.indexOf(resolvedRel);
          if (targetIndex !== -1) {
            resolvedFileId = `file_${targetIndex}`;
          }
        }

        db.insert(schema.imports)
          .values({
            id: `imp_${sourceIndex}_${impIdx}`,
            fileId: `file_${sourceIndex}`,
            source: imp.source,
            startLine: imp.range.startLine,
            endLine: imp.range.endLine,
            resolvedFileId,
          })
          .run();
      });
    });
  });

  it('calculates impact for utils.ts (deep bottom dependency)', () => {
    const analyzer = new ImpactAnalyzer(dbClient);
    const result = analyzer.analyze(runId, 'utils.ts');

    expect(result.targetFilePath).toBe('utils.ts');

    // Direct Dependencies
    expect(result.directDependencies).toHaveLength(0); // utils imports nothing

    // Direct Dependents
    expect(result.directDependents).toHaveLength(1);
    expect(result.directDependents[0].filePath).toBe('service.ts');

    // Transitive Dependents (controller, api, service.test)
    expect(result.transitiveDependents).toHaveLength(3);
    const transitivePaths = result.transitiveDependents.map((d) => d.filePath);
    expect(transitivePaths).toContain('controller.ts');
    expect(transitivePaths).toContain('api.ts');
    expect(transitivePaths).toContain('service.test.ts');

    // Related Tests
    expect(result.relatedTests).toHaveLength(1);
    expect(result.relatedTests[0].filePath).toBe('service.test.ts');

    // Risk Evaluation
    // utils.ts has fanIn: 1, depth: 3, lines: 3, hasTests: true, circular: false
    // Low risk!
    expect(result.risk.level).toBe('Low Risk');
  });

  it('calculates impact for api.ts (top level entry)', () => {
    const analyzer = new ImpactAnalyzer(dbClient);
    const result = analyzer.analyze(runId, 'api.ts');

    expect(result.targetFilePath).toBe('api.ts');

    // Direct Dependencies
    expect(result.directDependencies).toHaveLength(1);
    expect(result.directDependencies[0].filePath).toBe('controller.ts');

    // Direct Dependents
    expect(result.directDependents).toHaveLength(0);

    // Transitive Dependents
    expect(result.transitiveDependents).toHaveLength(0);

    // Risk
    // api.ts has fanIn: 0, depth: 0, no tests. Risk = Missing Tests (+20) -> Low Risk
    expect(result.risk.reasons).toContain('no related test');
  });

  it('throws an error for missing file', () => {
    const analyzer = new ImpactAnalyzer(dbClient);
    expect(() => analyzer.analyze(runId, 'missing.ts')).toThrow(/File not found/);
  });
});
