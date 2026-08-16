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

      const riskColor =
        result.risk.level === 'High Risk'
          ? pc.red
          : result.risk.level === 'Medium Risk'
            ? pc.yellow
            : pc.green;

      console.log(`\nImpact:\n${riskColor(result.risk.level.toUpperCase())}`);

      console.log(pc.bold('\nWhy:'));
      if (result.directDependents.length > 0) console.log(`• ${result.directDependents.length} files directly depend on this file.`);
      if (result.indirectDependents.length > 0) console.log(`• ${result.indirectDependents.length} files indirectly depend on this file.`);
      if (result.apiRoutes.length > 0) console.log(`• ${result.apiRoutes.length} API routes depend on it.`);
      if (result.relatedTests.length > 0) console.log(`• ${result.relatedTests.length} test suites cover related behavior.`);
      if (result.architecturalModule) console.log(`• Module belongs to ${result.architecturalModule} architecture area.`);
      
      result.risk.factors.forEach((f) => console.log(`• ${f.name} detected.`));

      console.log(pc.bold('\nPotentially affected:'));
      if (result.potentiallyAffectedFiles.length === 0) console.log('  None');
      result.potentiallyAffectedFiles.forEach((d) =>
        console.log(`${d.filePath}\n  ${pc.dim('Reason: ' + d.explanation)}`),
      );

      console.log(pc.bold('\nTests:'));
      if (result.relatedTests.length === 0) console.log('  None');
      result.relatedTests.forEach((d) => console.log(`${d.filePath}`));

      console.log(pc.bold('\nRecommended inspection order:'));
      console.log(`1. ${result.targetFilePath}`);
      result.recommendedInspectionOrder.forEach((d, i) => console.log(`${i + 2}. ${d.filePath}`));

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
