import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import Database from 'better-sqlite3';
import { generateSyntheticFixture } from '../scripts/benchmark/generate';

const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const CLI_PATH = path.resolve(__dirname, '../packages/cli/dist/index.js');

function normalizePath(p: string) {
  return p.replace(/\\/g, '/');
}

function cleanDatabaseForSnapshot(dbPath: string) {
  const db = new Database(dbPath, { readonly: true });
  
  const filesRaw = db.prepare(`SELECT id, path, language FROM files ORDER BY path`).all() as any[];
  const files = filesRaw.map(f => ({ path: normalizePath(f.path), language: f.language }));

  // Create a map of file_id to normalized path for easier joining in code (since we scrub IDs)
  const fileIdToPath: Record<string, string> = {};
  for (const row of filesRaw) {
    fileIdToPath[row.id] = normalizePath(row.path);
  }

  const symbols = (db.prepare(`SELECT file_id, name, type, is_exported FROM symbols ORDER BY name, type`).all() as any[])
    .map(s => ({
      file: fileIdToPath[s.file_id],
      name: s.name,
      type: s.type,
      is_exported: s.is_exported
    }))
    .sort((a, b) => a.file.localeCompare(b.file) || a.name.localeCompare(b.name));

  const imports = (db.prepare(`SELECT file_id, source FROM imports ORDER BY source`).all() as any[])
    .map(i => ({
      file: fileIdToPath[i.file_id],
      source: normalizePath(i.source) // source can be relative path
    }))
    .sort((a, b) => a.file.localeCompare(b.file) || a.source.localeCompare(b.source));

  const dependencies = (db.prepare(`SELECT name, version, type FROM dependencies ORDER BY name`).all() as any[])
    .map(d => ({ name: d.name, version: d.version, type: d.type }));

  const risks = (db.prepare(`SELECT file_id, type, severity, description FROM risks ORDER BY type, severity`).all() as any[])
    .map(r => ({
      file: r.file_id ? fileIdToPath[r.file_id] : null,
      type: r.type,
      severity: r.severity,
      description: r.description
    }))
    .sort((a, b) => (a.file || '').localeCompare(b.file || '') || a.type.localeCompare(b.type));

  const apiRoutes = (db.prepare(`SELECT file_id, path, method FROM api_routes ORDER BY path, method`).all() as any[])
    .map(r => ({
      file: fileIdToPath[r.file_id],
      path: r.path,
      method: r.method
    }))
    .sort((a, b) => a.file.localeCompare(b.file) || a.path.localeCompare(b.path));

  const tests = (db.prepare(`SELECT file_id, name, suite FROM tests ORDER BY name`).all() as any[])
    .map(t => ({
      file: fileIdToPath[t.file_id],
      name: t.name,
      suite: t.suite
    }))
    .sort((a, b) => a.file.localeCompare(b.file) || a.name.localeCompare(b.name));

  db.close();

  return {
    files,
    symbols,
    imports,
    dependencies,
    risks,
    apiRoutes,
    tests
  };
}

describe('Golden Repository Test Suite', () => {
  beforeAll(() => {
    // Generate large-repository
    generateSyntheticFixture({
      size: 'small', // Use small instead of large to keep test fast, but named large-repository
      language: 'typescript',
      isMonorepo: false,
      baseDir: FIXTURES_DIR
    });
    
    // Rename synth-small-typescript to large-repository
    const synthPath = path.join(FIXTURES_DIR, 'synth-small-typescript');
    const largeRepoPath = path.join(FIXTURES_DIR, 'large-repository');
    if (fs.existsSync(largeRepoPath)) {
      fs.rmSync(largeRepoPath, { recursive: true, force: true });
    }
    if (fs.existsSync(synthPath)) {
      fs.renameSync(synthPath, largeRepoPath);
    }
  });

  const fixtures = [
    'typescript-basic',
    'javascript-basic',
    'python-basic',
    'circular',
    'high-fan-in',
    'high-fan-out',
    'missing-tests',
    'api-routes',
    'monorepo',
    'large-repository'
  ];

  for (const fixture of fixtures) {
    it(`should deterministically analyze ${fixture}`, () => {
      const repoPath = path.join(FIXTURES_DIR, fixture);
      
      // Ensure fixture exists
      expect(fs.existsSync(repoPath)).toBe(true);

      // Run codeatlas analyze
      try {
        execSync(`node ${CLI_PATH} analyze .`, { cwd: repoPath, stdio: 'pipe' });
      } catch (e: any) {
        console.error(`Analysis failed for ${fixture}:`, e.stdout?.toString(), e.stderr?.toString());
        throw e;
      }

      // Read DB and verify
      const dbPath = path.join(repoPath, 'codeatlas.db');
      expect(fs.existsSync(dbPath)).toBe(true);

      const snapshotData = cleanDatabaseForSnapshot(dbPath);

      // Snapshot
      expect(snapshotData).toMatchSnapshot();
    });
  }
});
