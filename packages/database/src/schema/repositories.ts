import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const repositories = sqliteTable('repositories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  pathOrUrl: text('path_or_url').notNull(),
  type: text('type', { enum: ['local', 'git', 'github'] }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const commits = sqliteTable('commits', {
  id: text('id').primaryKey(),
  repositoryId: text('repository_id')
    .notNull()
    .references(() => repositories.id, { onDelete: 'cascade' }),
  hash: text('hash').notNull(),
  author: text('author'),
  date: integer('date', { mode: 'timestamp' }),
  message: text('message'),
});

export const analysisRuns = sqliteTable('analysis_runs', {
  id: text('id').primaryKey(),
  repositoryId: text('repository_id')
    .notNull()
    .references(() => repositories.id, { onDelete: 'cascade' }),
  commitId: text('commit_id')
    .notNull()
    .references(() => commits.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['pending', 'running', 'completed', 'failed'] }).notNull(),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
});
