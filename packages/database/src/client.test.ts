import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import { DatabaseClient } from './client';
import { schema } from './index';
import { eq } from 'drizzle-orm';

describe('DatabaseClient', () => {
  let client: DatabaseClient;

  beforeEach(() => {
    // Use an in-memory database for testing
    client = new DatabaseClient(':memory:');
    // Run migrations dynamically looking at the drizzle folder
    const migrationsFolder = path.resolve(__dirname, '../drizzle');
    client.runMigrations(migrationsFolder);
  });

  afterEach(() => {
    client.close();
  });

  it('can insert and retrieve a repository', () => {
    const { db } = client;

    db.insert(schema.repositories)
      .values({
        id: 'repo-1',
        name: 'test-repo',
        pathOrUrl: '/local/test-repo',
        type: 'local',
        createdAt: new Date(),
      })
      .run();

    const repos = db.select().from(schema.repositories).all();
    expect(repos).toHaveLength(1);
    expect(repos[0].id).toBe('repo-1');
    expect(repos[0].name).toBe('test-repo');
  });

  it('can persist files and symbols and query relations', () => {
    const { db } = client;

    client.transaction((tx) => {
      tx.insert(schema.repositories)
        .values({
          id: 'repo-2',
          name: 'codeatlas',
          pathOrUrl: 'https://github.com/test/codeatlas',
          type: 'github',
          createdAt: new Date(),
        })
        .run();

      tx.insert(schema.commits)
        .values({
          id: 'commit-1',
          repositoryId: 'repo-2',
          hash: 'abcdef123456',
          author: 'Alice',
          date: new Date(),
          message: 'Initial commit',
        })
        .run();

      tx.insert(schema.analysisRuns)
        .values({
          id: 'run-1',
          repositoryId: 'repo-2',
          commitId: 'commit-1',
          status: 'completed',
          startedAt: new Date(),
          completedAt: new Date(),
        })
        .run();

      tx.insert(schema.files)
        .values({
          id: 'file-1',
          runId: 'run-1',
          path: 'src/index.ts',
          language: 'ts',
          size: 1024,
          lines: 50,
          hash: 'filehash123',
        })
        .run();

      tx.insert(schema.symbols)
        .values({
          id: 'sym-1',
          fileId: 'file-1',
          name: 'DatabaseClient',
          type: 'class',
          startLine: 5,
          endLine: 20,
          isExported: true,
        })
        .run();
    });

    const fileSymbols = db
      .select()
      .from(schema.symbols)
      .where(eq(schema.symbols.fileId, 'file-1'))
      .all();

    expect(fileSymbols).toHaveLength(1);
    expect(fileSymbols[0].name).toBe('DatabaseClient');
  });

  it('enforces foreign key constraints (cascading deletes)', () => {
    const { db } = client;

    client.transaction((tx) => {
      tx.insert(schema.repositories)
        .values({
          id: 'repo-3',
          name: 'del-repo',
          pathOrUrl: '/tmp/del',
          type: 'local',
          createdAt: new Date(),
        })
        .run();

      tx.insert(schema.commits)
        .values({
          id: 'commit-2',
          repositoryId: 'repo-3',
          hash: 'aaaaaa',
        })
        .run();
    });

    let commits = db.select().from(schema.commits).all();
    expect(commits).toHaveLength(1);

    db.delete(schema.repositories).where(eq(schema.repositories.id, 'repo-3')).run();

    commits = db.select().from(schema.commits).all();
    expect(commits).toHaveLength(0); // Cascade deleted
  });
});
