import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { files } from './files';
import { analysisRuns, repositories } from './repositories';

export const tests = sqliteTable('tests', {
  id: text('id').primaryKey(),
  fileId: text('file_id')
    .notNull()
    .references(() => files.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  suite: text('suite'),
  startLine: integer('start_line'),
  endLine: integer('end_line'),
});

export const apiRoutes = sqliteTable('api_routes', {
  id: text('id').primaryKey(),
  fileId: text('file_id')
    .notNull()
    .references(() => files.id, { onDelete: 'cascade' }),
  path: text('path').notNull(),
  method: text('method').notNull(),
  startLine: integer('start_line'),
  endLine: integer('end_line'),
});

export const risks = sqliteTable('risks', {
  id: text('id').primaryKey(),
  runId: text('run_id')
    .notNull()
    .references(() => analysisRuns.id, { onDelete: 'cascade' }),
  fileId: text('file_id').references(() => files.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  severity: text('severity', { enum: ['low', 'medium', 'high', 'critical'] }).notNull(),
  description: text('description').notNull(),
});

export const aiCache = sqliteTable('ai_cache', {
  id: text('id').primaryKey(),
  repositoryId: text('repository_id').notNull().references(() => repositories.id, { onDelete: 'cascade' }),
  commitHash: text('commit_hash').notNull(),
  analysisType: text('analysis_type').notNull(),
  model: text('model').notNull(),
  schemaVersion: text('schema_version').notNull(),
  promptHash: text('prompt_hash').notNull(),
  responseJson: text('response_json').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
