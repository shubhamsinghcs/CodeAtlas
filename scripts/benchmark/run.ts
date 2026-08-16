import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { generateSyntheticFixture } from './generate';
import Database from 'better-sqlite3';

const BASE_TEMP_DIR = path.join(process.cwd(), 'fixtures', 'benchmarks');

interface BenchmarkResult {
  name: string;
  sizeCategory: string;
  language: string;
  repoSizeKB: number;
  fileCount: number;
  symbolCount: number;
  dependencyCount: number;
  analysisTimeMs: number;
  dbSizeKB: number;
}

const isCI = process.argv.includes('--ci');

// Define the configurations we want to benchmark
const configs = [
  { name: 'Small JS', size: 'small', language: 'javascript', isMonorepo: false },
  { name: 'Medium TS', size: 'medium', language: 'typescript', isMonorepo: false },
  { name: 'Medium TS Monorepo', size: 'medium', language: 'typescript', isMonorepo: true },
  { name: 'Medium Python', size: 'medium', language: 'python', isMonorepo: false },
];

if (!isCI) {
  configs.push({ name: 'Large TS Monorepo', size: 'large', language: 'typescript', isMonorepo: true });
}

function getDirSize(dirPath: string): number {
  let size = 0;
  const files = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const file of files) {
    const filePath = path.join(dirPath, file.name);
    if (file.isDirectory()) {
      size += getDirSize(filePath);
    } else {
      size += fs.statSync(filePath).size;
    }
  }
  return size;
}

function runBenchmark() {
  console.log('Running CodeAtlas Benchmarks...');
  if (!fs.existsSync(BASE_TEMP_DIR)) {
    fs.mkdirSync(BASE_TEMP_DIR, { recursive: true });
  }

  const results: BenchmarkResult[] = [];

  for (const config of configs) {
    console.log(`\nGenerating fixture: ${config.name}...`);
    const repoPath = generateSyntheticFixture({
      size: config.size as any,
      language: config.language as any,
      isMonorepo: config.isMonorepo,
      baseDir: BASE_TEMP_DIR,
    });

    const repoSizeKB = Math.round(getDirSize(repoPath) / 1024);

    console.log(`Analyzing ${config.name} at ${repoPath}...`);
    
    // We will use the built CLI directly. Assuming it's already built.
    const cliPath = path.resolve(process.cwd(), 'packages/cli/dist/index.js');
    
    const start = performance.now();
    try {
      execSync(`node ${cliPath} analyze .`, { stdio: 'inherit', cwd: repoPath });
    } catch (e) {
      console.error(`Failed to analyze ${config.name}`);
      process.exit(1);
    }
    const end = performance.now();
    const analysisTimeMs = Math.round(end - start);

    // Read DB stats
    const dbPath = path.join(repoPath, 'codeatlas.db');
    let fileCount = 0;
    let symbolCount = 0;
    let dependencyCount = 0;
    let dbSizeKB = 0;

    if (fs.existsSync(dbPath)) {
      dbSizeKB = Math.round(fs.statSync(dbPath).size / 1024);
      const db = new Database(dbPath, { readonly: true });
      fileCount = db.prepare('SELECT COUNT(*) as count FROM files').get()?.count || 0;
      symbolCount = db.prepare('SELECT COUNT(*) as count FROM symbols').get()?.count || 0;
      dependencyCount = db.prepare('SELECT COUNT(*) as count FROM imports').get()?.count || 0;
      db.close();
    }

    results.push({
      name: config.name,
      sizeCategory: config.size,
      language: config.language,
      repoSizeKB,
      fileCount,
      symbolCount,
      dependencyCount,
      analysisTimeMs,
      dbSizeKB
    });

    // CI Regression check
    if (isCI) {
      if (config.size === 'small' && analysisTimeMs > 10000) {
        console.error(`\n[REGRESSION] Small repo analysis took ${analysisTimeMs}ms (Threshold: 10000ms).`);
        process.exit(1);
      }
      if (config.size === 'medium' && analysisTimeMs > 60000) {
        console.error(`\n[REGRESSION] Medium repo analysis took ${analysisTimeMs}ms (Threshold: 60000ms).`);
        process.exit(1);
      }
    }
  }

  writeReport(results);
  
  if (isCI) {
    console.log('\n[CI] Benchmarks passed without detecting severe regressions.');
  }
}

function writeReport(results: BenchmarkResult[]) {
  const docsDir = path.join(process.cwd(), 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  let markdown = `# CodeAtlas Performance Benchmarks\n\n`;
  markdown += `These benchmarks run on synthetic repositories to honestly measure CodeAtlas performance and guard against accidental regressions.\n\n`;
  
  markdown += `| Fixture | Files | Repo Size | Symbols | Deps | DB Size | Time (ms) |\n`;
  markdown += `|---|---|---|---|---|---|---|\n`;

  for (const r of results) {
    markdown += `| ${r.name} | ${r.fileCount} | ${r.repoSizeKB} KB | ${r.symbolCount} | ${r.dependencyCount} | ${r.dbSizeKB} KB | **${r.analysisTimeMs}** |\n`;
  }

  markdown += `\n*Note: Time measured is total end-to-end wall-clock time for the \`analyze\` command, including database I/O. Memory is bounded by node's garbage collector. Results were generated automatically.*\n`;

  fs.writeFileSync(path.join(docsDir, 'benchmarks.md'), markdown, 'utf-8');
  console.log(`\nReport written to docs/benchmarks.md`);
}

runBenchmark();
