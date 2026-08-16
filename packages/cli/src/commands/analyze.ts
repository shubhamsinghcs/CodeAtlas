import { Command } from 'commander';
import { discoverRepository, AstEngine, DependencyResolver } from '@codeatlas/analyzer';
import { DatabaseClient, schema } from '@codeatlas/database';
import { eq } from 'drizzle-orm';
import * as path from 'path';
import * as path from 'path';
import pc from 'picocolors';

export const analyzeCommand = new Command('analyze')
  .description('Analyze a repository and persist data to SQLite')
  .argument('<target>', 'Local directory or GitHub URL to analyze')
  .action(async (target: string) => {
    console.log(pc.blue(`\n🔍 Starting CodeAtlas Analysis for: ${pc.cyan(target)}`));

    try {
      const dbClient = new DatabaseClient('codeatlas.db');
      dbClient.init();
      // For now, assume tables are created or we push schemas.

      console.log(pc.gray('Detecting repository...'));
      const repoDetails = await discoverRepository(target);

      console.log(pc.green(`✓ Repository detected: ${repoDetails.type}`));

      // Save Repo to DB
      const repoId = `repo_${Date.now()}`;
      dbClient.db
        .insert(schema.repositories)
        .values({
          id: repoId,
          name: path.basename(repoDetails.localPath),
          pathOrUrl: target,
          type: repoDetails.type,
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
          status: 'in_progress',
          startedAt: new Date(),
        })
        .run();

      console.log(pc.gray('Parsing ASTs and gathering symbols/imports...'));
      const astEngine = new AstEngine();

      const absoluteFiles = repoDetails.files.map((f: { absolutePath: string }) => f.absolutePath);
      const resolver = new DependencyResolver(repoDetails.localPath, absoluteFiles);

      let totalSymbols = 0;
      let totalDependencies = 0;

      for (let i = 0; i < repoDetails.files.length; i++) {
        const file = repoDetails.files[i];
        const fileId = `file_${runId}_${i}`;

        dbClient.db
          .insert(schema.files)
          .values({
            id: fileId,
            runId,
            path: file.path,
            language: file.language,
            size: file.size,
            lines: file.lineCount,
          })
          .run();

        // Map language strings for AST Engine
        let astLang = file.language;
        if (astLang === 'typescript') astLang = 'ts';
        if (astLang === 'javascript') astLang = 'js';
        if (astLang === 'python') astLang = 'py';

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
      console.log(pc.yellow('\nTo view results:'));
      console.log(`  Run ${pc.cyan('codeatlas serve')} to start the dashboard`);
      console.log(`  Run ${pc.cyan('codeatlas impact <file>')} to check blast radius`);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(pc.red(`\n❌ Analysis Failed: ${error.message}`));
      } else {
        console.error(pc.red(`\n❌ Analysis Failed: Unknown error`));
      }
      process.exit(1);
    }
  });
