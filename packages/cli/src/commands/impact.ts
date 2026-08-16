import { Command } from 'commander';
import { DatabaseClient, schema } from '@codeatlas/database';
import { ImpactAnalyzer } from '@codeatlas/analyzer';
import { desc } from 'drizzle-orm';
import pc from 'picocolors';

export const impactCommand = new Command('impact')
  .description('Analyze the change-impact of a specific file')
  .argument('<file>', 'File path to analyze (relative to the repository root)')
  .action((file: string) => {
    try {
      const dbClient = new DatabaseClient('codeatlas.db');

      const latestRun = dbClient.db
        .select()
        .from(schema.analysisRuns)
        .orderBy(desc(schema.analysisRuns.startedAt))
        .get();
      if (!latestRun) {
        console.error(pc.red('No analysis runs found. Please run "codeatlas analyze" first.'));
        process.exit(1);
      }

      const analyzer = new ImpactAnalyzer(dbClient);
      const result = analyzer.analyze(latestRun.id, file);

      console.log(pc.bold(pc.blue(`\nImpact Analysis for: ${pc.cyan(result.targetFilePath)}`)));
      console.log('--------------------------------------------------');

      console.log(pc.bold('Direct Dependencies (imported by this file):'));
      if (result.directDependencies.length === 0) console.log('  None');
      result.directDependencies.forEach((d) =>
        console.log(`  - ${d.filePath} (${pc.dim(d.explanation)})`),
      );

      console.log(pc.bold('\nDirect Dependents (imports this file):'));
      if (result.directDependents.length === 0) console.log('  None');
      result.directDependents.forEach((d) =>
        console.log(`  - ${d.filePath} (${pc.dim(d.explanation)})`),
      );

      console.log(pc.bold('\nTransitive Dependents (ripple effect):'));
      if (result.transitiveDependents.length === 0) console.log('  None');
      result.transitiveDependents.forEach((d) =>
        console.log(`  - ${d.filePath} (${pc.dim(d.explanation)})`),
      );

      console.log(pc.bold('\nRelated Tests:'));
      if (result.relatedTests.length === 0) console.log('  None');
      result.relatedTests.forEach((d) => console.log(`  - ${d.filePath}`));

      console.log(pc.bold('\nArchitectural Risk:'));
      const riskColor =
        result.risk.level === 'High Risk'
          ? pc.red
          : result.risk.level === 'Medium Risk'
            ? pc.yellow
            : pc.green;
      console.log(`  Level: ${riskColor(result.risk.level)} (Score: ${result.risk.score})`);
      if (result.risk.reasons.length > 0) {
        console.log(`  Reasons:`);
        result.risk.reasons.forEach((r) => console.log(`    - ${r}`));
      }

      console.log('\n');
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(pc.red(`\nError: ${error.message}`));
      } else {
        console.error(pc.red(`\nError: Unknown error`));
      }
      process.exit(1);
    }
  });
