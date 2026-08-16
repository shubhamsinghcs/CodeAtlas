import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { HotspotDetector } from './detector';
import { DatabaseClient, schema } from '@codeatlas/database';
import * as path from 'path';

describe('HotspotDetector', () => {
  let dbClient: DatabaseClient;

  beforeAll(() => {
    // In-memory sqlite for tests
    dbClient = new DatabaseClient(':memory:');
    const migrationsFolder = path.resolve(__dirname, '../../../database/drizzle');
    dbClient.runMigrations(migrationsFolder);
    
    // Seed repositories and analysis runs
    dbClient.db.insert(schema.repositories).values({
      id: 'repo_1',
      type: 'local_git',
      localPath: '/tmp/repo'
    }).run();

    dbClient.db.insert(schema.analysisRuns).values({
      id: 'run_1',
      repositoryId: 'repo_1',
      startedAt: new Date().toISOString()
    }).run();
  });

  beforeEach(() => {
    // Clear out files and imports before each test
    dbClient.db.delete(schema.imports).run();
    dbClient.db.delete(schema.files).run();
  });

  it('should return empty array for empty repositories', () => {
    const detector = new HotspotDetector(dbClient);
    const hotspots = detector.detect('run_1');
    expect(hotspots).toHaveLength(0);
  });

  it('should calculate metrics and rank hotspots correctly', () => {
    // Insert some files
    dbClient.db.insert(schema.files).values([
      { id: 'file_1', runId: 'run_1', path: 'src/god_object.ts', language: 'ts', size: 10000, lines: 600, churn: 'HIGH' },
      { id: 'file_2', runId: 'run_1', path: 'src/utils.ts', language: 'ts', size: 1000, lines: 50, churn: 'LOW' },
      { id: 'file_3', runId: 'run_1', path: 'src/auth.ts', language: 'ts', size: 5000, lines: 350, churn: 'MEDIUM' },
      { id: 'file_4', runId: 'run_1', path: 'tests/auth.test.ts', language: 'ts', size: 1000, lines: 50, churn: 'LOW' }
    ]).run();

    // Insert some dependencies (file_1 has many fanIn/fanOut)
    // Create 10 fanIn for file_1 to make it a hotspot
    for(let i=0; i<12; i++) {
      dbClient.db.insert(schema.files).values({
        id: `dep_${i}`, runId: 'run_1', path: `src/dep_${i}.ts`, language: 'ts', size: 100, lines: 10
      }).run();
      
      dbClient.db.insert(schema.imports).values({
        id: `imp_in_${i}`,
        fileId: `dep_${i}`,
        resolvedFileId: 'file_1',
        source: 'src/god_object'
      }).run();
    }

    // file_4 tests file_3
    dbClient.db.insert(schema.imports).values({
      id: 'imp_test',
      fileId: 'file_4',
      resolvedFileId: 'file_3',
      source: '../src/auth'
    }).run();

    const detector = new HotspotDetector(dbClient);
    const hotspots = detector.detect('run_1');

    // file_1 should be ranked highest (High fanIn, high churn, large size, missing tests)
    expect(hotspots.length).toBeGreaterThan(0);
    expect(hotspots[0].fileId).toBe('file_1');
    expect(hotspots[0].severity).toBe('🔥');
    expect(hotspots[0].explanations.map(e => e.factor)).toContain('High fan-in');
    expect(hotspots[0].explanations.map(e => e.factor)).toContain('Large size');
    expect(hotspots[0].explanations.map(e => e.factor)).toContain('Missing tests');
    expect(hotspots[0].explanations.map(e => e.factor)).toContain('High recent churn');

    // tests/auth.test.ts should NOT be in hotspots
    expect(hotspots.find(h => h.fileId === 'file_4')).toBeUndefined();
    
    // file_3 should have some score (Moderate size, Moderate churn, has tests so missing tests is absent)
    const file3Hotspot = hotspots.find(h => h.fileId === 'file_3');
    if (file3Hotspot) {
      expect(file3Hotspot.severity).toBe('⚠');
      expect(file3Hotspot.explanations.map(e => e.factor)).not.toContain('Missing tests');
    }
  });
});
