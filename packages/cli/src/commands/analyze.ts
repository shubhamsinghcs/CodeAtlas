import { Command } from 'commander';
import { discoverRepository, AstEngine, DependencyResolver, GitHistoryCollector } from '@codeatlas/analyzer';
import { DatabaseClient, schema } from '@codeatlas/database';
import { resolveConfig, DatabaseCorruptionError } from '@codeatlas/shared';
import { formatErrorForDX } from '../utils/errors';
import { eq } from 'drizzle-orm';
import * as path from 'path';
import pc from 'picocolors';

export const analyzeCommand = new Command('analyze')
  .description('Analyze a repository and persist data to SQLite')
  .argument('<target>', 'Local directory or GitHub URL to analyze')
  .option('--ignore <patterns...>', 'Ignore patterns (space separated)')
  .option('--verbose', 'Enable verbose output and stack traces')
  .action(async (target: string, options: { ignore?: string[], verbose?: boolean }) => {
    console.log(pc.blue(`\n🔍 Starting CodeAtlas Analysis for: ${pc.cyan(target)}`));

    try {
      const config = resolveConfig(path.resolve(target), { ignore: options.ignore });
      if (config.merged.ignore.length > 0) {
        console.log(pc.gray(`Using ignore patterns: ${config.merged.ignore.join(', ')}`));
      }
      const dbClient = new DatabaseClient('codeatlas.db');
      dbClient.init();
      // For now, assume tables are created or we push schemas.

      console.log(pc.gray('Detecting repository...'));
      const repoDetails = await discoverRepository(target, {
        ignoredPaths: config.merged.ignore
      });

      console.log(pc.green(`✓ Repository detected: ${repoDetails.type}`));

      // Save Repo to DB
      const repoId = `repo_${Date.now()}`;
      dbClient.db
        .insert(schema.repositories)
        .values({
          id: repoId,
          name: path.basename(repoDetails.localPath),
          pathOrUrl: target,
          type: repoDetails.type === 'github_url' ? 'github' : repoDetails.type === 'local_git' ? 'git' : 'local',
          createdAt: new Date(),
        })
        .onConflictDoNothing()
        .run();

      const commitId = `commit_${Date.now()}`;
      dbClient.db
        .insert(schema.commits)
        .values({
          id: commitId,
          repositoryId: repoId,
          hash: repoDetails.commitHash || 'unknown',
        })
        .run();

      const runId = `run_${Date.now()}`;
      dbClient.db
        .insert(schema.analysisRuns)
        .values({
          id: runId,
          repositoryId: repoId,
          commitId,
          status: 'running',
          startedAt: new Date(),
        })
        .run();

      console.log(pc.gray('Parsing ASTs and gathering symbols/imports...'));
      const astEngine = new AstEngine();

      const absoluteFiles = repoDetails.files.map((f: { absolutePath: string }) => f.absolutePath);
      const resolver = new DependencyResolver(repoDetails.localPath, absoluteFiles);

      // Collect Git History if applicable
      let gitMetricsMap = new Map();
      if (repoDetails.type === 'local_git' || repoDetails.type === 'github_url') {
        console.log(pc.gray('Analyzing Git history (this may take a few seconds)...'));
        const gitCollector = new GitHistoryCollector(repoDetails.localPath);
        // Map relative paths to expected Git output (which is also relative to repo root)
        const filePaths = repoDetails.files.map(f => f.path);
        gitMetricsMap = gitCollector.collect(filePaths);
      }

      let totalSymbols = 0;
      let totalDependencies = 0;

      for (let i = 0; i < repoDetails.files.length; i++) {
        const file = repoDetails.files[i];
        const fileId = `file_${runId}_${i}`;

        const gitMetrics = gitMetricsMap.get(file.path);

        dbClient.db
          .insert(schema.files)
          .values({
            id: fileId,
            runId,
            path: file.path,
            language: file.language,
            size: file.size,
            lines: file.lineCount,
            commitCount: gitMetrics?.commitCount,
            authorCount: gitMetrics?.authorCount,
            recentModifications: gitMetrics?.recentModifications,
            lastModified: gitMetrics?.lastModified,
            churn: gitMetrics?.churn,
          })
          .run();

        // Language values from discovery already match the AST engine format ('ts', 'js', 'py', etc.)
        const astLang = file.language;
        const result = astEngine.analyzeFile(file.absolutePath, astLang);

        if (!result.hasSyntaxErrors) {
          result.symbols.forEach((sym, symIdx) => {
            dbClient.db
              .insert(schema.symbols)
              .values({
                id: `sym_${fileId}_${symIdx}`,
                fileId,
                name: sym.name,
                type: sym.type,
                startLine: sym.range.startLine,
                endLine: sym.range.endLine,
                isExported: sym.isExported,
              })
              .run();
            totalSymbols++;
          });

          result.imports.forEach((imp, impIdx) => {
            const resolvedAbs = resolver.resolve(file.absolutePath, imp.source);
            let resolvedFileId = null;

            if (resolvedAbs) {
              // Find which file in our DB this corresponds to
              const targetRel = path
                .relative(repoDetails.localPath, resolvedAbs)
                .replace(/\\/g, '/');
              const targetIndex = repoDetails.files.findIndex((f: { path: string }) => f.path === targetRel);
              if (targetIndex !== -1) {
                resolvedFileId = `file_${runId}_${targetIndex}`;
              }
            }

            dbClient.db
              .insert(schema.imports)
              .values({
                id: `imp_${fileId}_${impIdx}`,
                fileId,
                source: imp.source,
                startLine: imp.range.startLine,
                endLine: imp.range.endLine,
                resolvedFileId,
              })
              .run();
            totalDependencies++;
          });
        }
      }

      dbClient.db
        .update(schema.analysisRuns)
        .set({ status: 'completed' })
        .where(eq(schema.analysisRuns.id, runId))
        .run();

      console.log(pc.green('\n✅ Analysis Complete!'));
      console.log('--------------------------------------------------');
      console.log(`Repository:   ${target}`);
      console.log(`Commit:       ${repoDetails.commitHash || 'unknown'}`);
      console.log(`Files:        ${repoDetails.files.length}`);
      console.log(`Symbols:      ${totalSymbols}`);
      console.log(`Dependencies: ${totalDependencies}`);
      console.log(`Ignored items:${repoDetails.ignoredCount}`);
      console.log(pc.yellow('\nTo view results:'));
      console.log(`  Run ${pc.cyan('codeatlas serve')} to start the dashboard`);
      console.log(`  Run ${pc.cyan('codeatlas impact <file>')} to check blast radius`);
    } catch (error: any) {
      if (error.name === 'SqliteError') {
        error = new DatabaseCorruptionError(error.message);
      }
      
      console.error(formatErrorForDX(error, options.verbose));
      process.exit(1);
    }
  });
