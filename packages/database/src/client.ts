import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';

export class DatabaseClient {
  public db: ReturnType<typeof drizzle>;
  private sqlite: Database.Database;

  constructor(dbPath: string = ':memory:') {
    this.sqlite = new Database(dbPath);
    this.sqlite.pragma('foreign_keys = ON');
    this.sqlite.pragma('journal_mode = WAL');

    this.db = drizzle(this.sqlite, { schema });
  }

  public runMigrations(migrationsFolder: string) {
    migrate(this.db, { migrationsFolder });
  }

  public close() {
    this.sqlite.close();
  }

  public init() {
    this.sqlite.exec(`
CREATE TABLE IF NOT EXISTS \`repositories\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`name\` text NOT NULL,
	\`path_or_url\` text NOT NULL,
	\`type\` text NOT NULL,
	\`created_at\` integer NOT NULL
);
CREATE TABLE IF NOT EXISTS \`commits\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`repository_id\` text NOT NULL,
	\`hash\` text NOT NULL,
	\`author\` text,
	\`date\` integer,
	\`message\` text,
	FOREIGN KEY (\`repository_id\`) REFERENCES \`repositories\`(\`id\`) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE IF NOT EXISTS \`analysis_runs\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`repository_id\` text NOT NULL,
	\`commit_id\` text NOT NULL,
	\`status\` text NOT NULL,
	\`started_at\` integer NOT NULL,
	\`completed_at\` integer,
	FOREIGN KEY (\`repository_id\`) REFERENCES \`repositories\`(\`id\`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (\`commit_id\`) REFERENCES \`commits\`(\`id\`) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE IF NOT EXISTS \`files\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`run_id\` text NOT NULL,
	\`path\` text NOT NULL,
	\`language\` text NOT NULL,
	\`size\` integer NOT NULL,
	\`lines\` integer NOT NULL,
	\`hash\` text,
	FOREIGN KEY (\`run_id\`) REFERENCES \`analysis_runs\`(\`id\`) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE IF NOT EXISTS \`imports\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`file_id\` text NOT NULL,
	\`source\` text NOT NULL,
	\`start_line\` integer NOT NULL,
	\`end_line\` integer NOT NULL,
	\`resolved_file_id\` text REFERENCES files(id),
	FOREIGN KEY (\`file_id\`) REFERENCES \`files\`(\`id\`) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE IF NOT EXISTS \`symbols\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`file_id\` text NOT NULL,
	\`name\` text NOT NULL,
	\`type\` text NOT NULL,
	\`start_line\` integer NOT NULL,
	\`end_line\` integer NOT NULL,
	\`is_exported\` integer NOT NULL,
	FOREIGN KEY (\`file_id\`) REFERENCES \`files\`(\`id\`) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE IF NOT EXISTS \`dependencies\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`run_id\` text NOT NULL,
	\`name\` text NOT NULL,
	\`version\` text NOT NULL,
	\`type\` text NOT NULL,
	FOREIGN KEY (\`run_id\`) REFERENCES \`analysis_runs\`(\`id\`) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE IF NOT EXISTS \`import_symbols\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`import_id\` text NOT NULL,
	\`name\` text NOT NULL,
	FOREIGN KEY (\`import_id\`) REFERENCES \`imports\`(\`id\`) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE IF NOT EXISTS \`ai_cache\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`key\` text NOT NULL,
	\`value\` text NOT NULL,
	\`created_at\` integer NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS \`ai_cache_key_unique\` ON \`ai_cache\` (\`key\`);
CREATE TABLE IF NOT EXISTS \`api_routes\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`file_id\` text NOT NULL,
	\`path\` text NOT NULL,
	\`method\` text NOT NULL,
	\`start_line\` integer,
	\`end_line\` integer,
	FOREIGN KEY (\`file_id\`) REFERENCES \`files\`(\`id\`) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE IF NOT EXISTS \`risks\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`run_id\` text NOT NULL,
	\`file_id\` text,
	\`type\` text NOT NULL,
	\`severity\` text NOT NULL,
	\`description\` text NOT NULL,
	FOREIGN KEY (\`run_id\`) REFERENCES \`analysis_runs\`(\`id\`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (\`file_id\`) REFERENCES \`files\`(\`id\`) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE IF NOT EXISTS \`tests\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`file_id\` text NOT NULL,
	\`name\` text NOT NULL,
	\`suite\` text,
	\`start_line\` integer,
	\`end_line\` integer,
	FOREIGN KEY (\`file_id\`) REFERENCES \`files\`(\`id\`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX IF NOT EXISTS \`import_file_idx\` ON \`imports\` (\`file_id\`);
CREATE INDEX IF NOT EXISTS \`symbol_name_idx\` ON \`symbols\` (\`name\`);
CREATE INDEX IF NOT EXISTS \`symbol_file_idx\` ON \`symbols\` (\`file_id\`);
CREATE INDEX IF NOT EXISTS \`import_symbol_idx\` ON \`import_symbols\` (\`import_id\`);
    `);
  }

  // Type-safe transaction wrapper
  public transaction<T>(
    cb: (tx: Parameters<Parameters<ReturnType<typeof drizzle>['transaction']>[0]>[0]) => T,
  ): T {
    return this.db.transaction(cb);
  }
}
