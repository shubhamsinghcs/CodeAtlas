import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PatternDetector } from './detector';
import { DatabaseClient, schema } from '@codeatlas/database';
import { ImpactAnalyzer } from '../impact/analyzer';
import { RiskEngine } from '@codeatlas/risk-engine';
import * as path from 'path';

describe('PatternDetector', () => {
  let dbClient: DatabaseClient;
  let impactAnalyzer: ImpactAnalyzer;
  let detector: PatternDetector;

  beforeEach(() => {
    dbClient = new DatabaseClient(':memory:');
    const migrationsFolder = path.resolve(__dirname, '../../../../packages/database/drizzle');
    dbClient.runMigrations(migrationsFolder);
    const { db } = dbClient;
    
    db.insert(schema.repositories).values({ id: 'repo1', pathOrUrl: 'test', type: 'local', name: 'test', createdAt: new Date() }).run();
    db.insert(schema.commits).values({ id: 'commit1', repositoryId: 'repo1', hash: '123' }).run();
    db.insert(schema.analysisRuns).values({ id: 'run1', repositoryId: 'repo1', commitId: 'commit1', status: 'completed', startedAt: new Date() }).run();

    // 1. Repeated API Pattern
    db.insert(schema.files).values({ id: 'file_api1', runId: 'run1', path: 'src/api/tasks/create.ts', language: 'typescript', size: 100, lines: 10 }).run();
    db.insert(schema.files).values({ id: 'file_api2', runId: 'run1', path: 'src/api/projects/create.ts', language: 'typescript', size: 100, lines: 10 }).run();
    
    // 2. Repeated Service Pattern
    db.insert(schema.files).values({ id: 'file_svc1', runId: 'run1', path: 'src/services/tasks.ts', language: 'typescript', size: 100, lines: 10 }).run();
    db.insert(schema.files).values({ id: 'file_svc2', runId: 'run1', path: 'src/services/projects.ts', language: 'typescript', size: 100, lines: 10 }).run();

    // 3. Repeated Test Pattern
    db.insert(schema.files).values({ id: 'file_test1', runId: 'run1', path: 'src/api/tasks/create.test.ts', language: 'typescript', size: 100, lines: 10 }).run();
    
    // 4. Unrelated
    db.insert(schema.files).values({ id: 'file_unrelated', runId: 'run1', path: 'src/utils/math.ts', language: 'typescript', size: 100, lines: 10 }).run();
    
    // Symbols to make matching richer
    db.insert(schema.symbols).values({ id: 'sym1', fileId: 'file_api1', name: 'createTask', type: 'function', startLine: 1, endLine: 5, isExported: true }).run();
    db.insert(schema.symbols).values({ id: 'sym2', fileId: 'file_api2', name: 'createProject', type: 'function', startLine: 1, endLine: 5, isExported: true }).run();

    // Imports for Impact Analyzer
    db.insert(schema.imports).values({ id: 'imp1', fileId: 'file_test1', source: './create', startLine: 1, endLine: 1, resolvedFileId: 'file_api1' }).run();

    impactAnalyzer = new ImpactAnalyzer(dbClient, new RiskEngine());
    detector = new PatternDetector(dbClient, impactAnalyzer);
  });

  it('detects repeated API patterns', () => {
    const patterns = detector.detectPatterns('run1', 'Create user API endpoint');
    expect(patterns.length).toBeGreaterThan(0);
    
    const paths = patterns.map(p => p.filePath);
    expect(paths).toContain('src/api/projects/create.ts');
    expect(paths).toContain('src/api/tasks/create.ts');
    
    // Ensure the reason is generated
    expect(patterns[0].reason).toContain('Potential existing pattern');
  });

  it('detects service patterns', () => {
    const patterns = detector.detectPatterns('run1', 'Build project service layer');
    expect(patterns.length).toBeGreaterThan(0);
    
    const paths = patterns.map(p => p.filePath);
    expect(paths).toContain('src/services/projects.ts');
    
    // It should extract the architecture module successfully from impact
    expect(patterns[0].architecturalModule).toBe('src/services');
  });

  it('does not include tests by default', () => {
    const patterns = detector.detectPatterns('run1', 'Create task API');
    const paths = patterns.map(p => p.filePath);
    expect(paths).toContain('src/api/tasks/create.ts');
    expect(paths).not.toContain('src/api/tasks/create.test.ts');
  });

  it('includes tests if requested', () => {
    const patterns = detector.detectPatterns('run1', 'Create task API tests');
    const paths = patterns.map(p => p.filePath);
    expect(paths).toContain('src/api/tasks/create.test.ts');
  });
  
  it('returns relatedTests from ImpactAnalyzer', () => {
    const patterns = detector.detectPatterns('run1', 'Create task API');
    const taskApi = patterns.find(p => p.filePath === 'src/api/tasks/create.ts');
    expect(taskApi).toBeDefined();
    expect(taskApi!.relatedTests).toContain('src/api/tasks/create.test.ts');
  });
});
