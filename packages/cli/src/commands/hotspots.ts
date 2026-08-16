import { Command } from 'commander';
import { DatabaseClient, schema } from '@codeatlas/database';
import { HotspotDetector } from '@codeatlas/analyzer';
import { desc } from 'drizzle-orm';
import pc from 'picocolors';

export const hotspotsCommand = new Command('hotspots')
  .description('Identify architectural hotspots in the repository')
  .action(() => {
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

      console.log(pc.gray('Analyzing architectural hotspots...'));

      const detector = new HotspotDetector(dbClient);
      const hotspots = detector.detect(latestRun.id);

      if (hotspots.length === 0) {
        console.log(pc.green('\n✓ No significant architectural hotspots detected.'));
        return;
      }

      console.log(pc.bold(pc.blue('\nRepository Hotspots')));
      console.log('--------------------------------------------------\n');

      for (const h of hotspots) {
        const severityIcon = h.severity === '🔥' ? pc.red(h.severity) : pc.yellow(h.severity);
        console.log(`${severityIcon} ${pc.bold(h.filePath)} ${pc.dim(`(Score: ${h.score})`)}`);
        
        for (const exp of h.explanations) {
          console.log(`  • ${pc.bold(exp.factor)}: ${exp.description}`);
        }
        console.log(); // blank line
      }

    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(pc.red(`\nError: ${error.message}`));
      } else {
        console.error(pc.red(`\nError: Unknown error`));
      }
      process.exit(1);
    }
  });
