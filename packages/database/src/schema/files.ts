import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { analysisRuns } from './repositories';

export const files = sqliteTable('files', {
  id: text('id').primaryKey(),
  runId: text('run_id')
    .notNull()
    .references(() => analysisRuns.id, { onDelete: 'cascade' }),
  path: text('path').notNull(),
  language: text('language').notNull(),
  size: integer('size').notNull(),
  lines: integer('lines').notNull(),
  hash: text('hash'),
});

export const dependencies = sqliteTable('dependencies', {
  id: text('id').primaryKey(),
  runId: text('run_id')
    .notNull()
    .references(() => analysisRuns.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  version: text('version').notNull(),
  type: text('type', { enum: ['prod', 'dev', 'peer'] }).notNull(),
});
