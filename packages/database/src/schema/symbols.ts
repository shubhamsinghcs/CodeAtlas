import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { files } from './files';

export const symbols = sqliteTable(
  'symbols',
  {
    id: text('id').primaryKey(),
    fileId: text('file_id')
      .notNull()
      .references(() => files.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: text('type', { enum: ['function', 'class', 'method', 'variable'] }).notNull(),
    startLine: integer('start_line').notNull(),
    endLine: integer('end_line').notNull(),
    isExported: integer('is_exported', { mode: 'boolean' }).notNull(),
  },
  (table) => ({
    nameIdx: index('symbol_name_idx').on(table.name),
    fileIdx: index('symbol_file_idx').on(table.fileId),
  }),
);

export const imports = sqliteTable(
  'imports',
  {
    id: text('id').primaryKey(),
    fileId: text('file_id')
      .notNull()
      .references(() => files.id, { onDelete: 'cascade' }),
    source: text('source').notNull(),
    startLine: integer('start_line').notNull(),
    endLine: integer('end_line').notNull(),
    resolvedFileId: text('resolved_file_id').references(() => files.id, { onDelete: 'set null' }),
  },
  (table) => ({
    fileIdx: index('import_file_idx').on(table.fileId),
  }),
);

export const importSymbols = sqliteTable(
  'import_symbols',
  {
    id: text('id').primaryKey(),
    importId: text('import_id')
      .notNull()
      .references(() => imports.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
  },
  (table) => ({
    importIdx: index('import_symbol_idx').on(table.importId),
  }),
);
