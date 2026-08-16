import { Command } from 'commander';
import { DatabaseClient, schema } from '@codeatlas/database';
import { ImpactAnalyzer } from '@codeatlas/analyzer';
import { desc, eq } from 'drizzle-orm';
import pc from 'picocolors';
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { formatErrorForDX } from '../utils/errors';

function getChangedFiles(baseRef?: string, headRef?: string): string[] {
  let base = baseRef;
  let head = headRef;

  if (!base) {
    if (process.env.GITHUB_BASE_REF) {
      base = `origin/${process.env.GITHUB_BASE_REF}`;
    } else {
      // Fallback for local testing if no base is provided
      base = 'HEAD~1';
    }
  }

  if (!head) {
    if (process.env.GITHUB_SHA) {
      head = process.env.GITHUB_SHA;
    } else {
      head = 'HEAD';
    }
  }

  try {
    const diff = child_process.execSync(`git diff --name-only ${base}...${head}`, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore']
    });
    return diff.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  } catch (e) {
    try {
      // If three-dot fails, try two-dot or just direct diff
      const diff2 = child_process.execSync(`git diff --name-only ${base} ${head}`, {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore']
      });
      return diff2.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    } catch {
      throw new Error(`Failed to compute git diff between ${base} and ${head}. Make sure you have fetched the branches (e.g. actions/checkout with fetch-depth: 0)`);
    }
  }
}

interface PRImpactAggregation {
  changedFiles: string[];
  potentiallyAffected: Set<string>;
  highRiskModules: Set<string>;
  circularDependencies: number;
  relatedTests: Set<string>;
  highestRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  explanations: Array<{ file: string; risk: string; explanation: string }>;
}

async function postGitHubComment(markdown: string) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.log(pc.yellow('No GITHUB_TOKEN provided. Skipping PR comment posting.'));
    return;
  }

  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !fs.existsSync(eventPath)) {
    console.log(pc.yellow('No GITHUB_EVENT_PATH found. Not running inside a GitHub Action PR event?'));
    return;
  }

  const eventData = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
  const prNumber = eventData.pull_request?.number;
  if (!prNumber) {
    console.log(pc.yellow('Could not find pull_request number in GitHub event payload. Skipping comment.'));
    return;
  }

  const repo = process.env.GITHUB_REPOSITORY; // e.g. "codeatlas/codeatlas"
  if (!repo) return;

  console.log(pc.blue(`Posting impact report to PR #${prNumber} on ${repo}...`));

  const url = `https://api.github.com/repos/${repo}/issues/${prNumber}/comments`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        body: markdown
      })
    });

    if (!response.ok) {
      console.error(pc.red(`Failed to post comment. GitHub API responded with ${response.status}: ${await response.text()}`));
    } else {
      console.log(pc.green('Successfully posted PR comment!'));
    }
  } catch (error) {
    console.error(pc.red(`Network error posting comment: ${error}`));
  }
}

export const prCommand = new Command('pr')
  .description('Analyze PR impact and optionally post a GitHub comment')
  .option('--base <string>', 'Base git ref (e.g. origin/main)')
  .option('--head <string>', 'Head git ref (e.g. HEAD)')
  .option('--verbose', 'Show verbose error stack traces')
  .action(async (options) => {
    try {
      const changedFiles = getChangedFiles(options.base, options.head);
      if (changedFiles.length === 0) {
        console.log(pc.yellow('No changed files detected.'));
        process.exit(0);
      }

      const dbClient = new DatabaseClient('codeatlas.db');
      const latestRun = dbClient.db
        .select()
        .from(schema.analysisRuns)
        .orderBy(desc(schema.analysisRuns.startedAt))
        .get();

      if (!latestRun) {
        throw new Error('No analysis runs found. Please run "codeatlas analyze" first.');
      }

      const analyzer = new ImpactAnalyzer(dbClient);

      const aggregation: PRImpactAggregation = {
        changedFiles,
        potentiallyAffected: new Set<string>(),
        highRiskModules: new Set<string>(),
        circularDependencies: 0,
        relatedTests: new Set<string>(),
        highestRisk: 'LOW',
        explanations: []
      };

      const validChangedFiles = [];

      for (const file of changedFiles) {
        // Skip files that CodeAtlas doesn't know about (e.g. markdown, images)
        const dbFile = dbClient.db
          .select()
          .from(schema.files)
          .where(eq(schema.files.path, file))
          .get();
        if (!dbFile) continue;
        validChangedFiles.push(file);

        const result = analyzer.analyze(latestRun.id, file);

        result.potentiallyAffectedFiles.forEach(f => aggregation.potentiallyAffected.add(f.filePath));
        result.relatedTests.forEach(t => aggregation.relatedTests.add(t.filePath));
        
        if (result.risk.level === 'High Risk') {
          aggregation.highestRisk = 'HIGH';
          aggregation.highRiskModules.add(result.architecturalModule);
        } else if (result.risk.level === 'Medium Risk' && aggregation.highestRisk === 'LOW') {
          aggregation.highestRisk = 'MEDIUM';
        }

        if (result.risk.factors.some(f => f.name.includes('Circular'))) {
          aggregation.circularDependencies++;
        }

        aggregation.explanations.push({
          file,
          risk: result.risk.level,
          explanation: `Impacts ${result.potentiallyAffectedFiles.length} files. ${result.risk.factors.map(f => f.name).join(', ')}.`
        });
      }

      let markdown = `## CodeAtlas Impact\n\n`;
      markdown += `Risk: ${aggregation.highestRisk}\n\n`;
      markdown += `Changed:\n${validChangedFiles.length} files\n\n`;
      markdown += `Potentially affected:\n${aggregation.potentiallyAffected.size} files\n\n`;
      markdown += `High-risk modules:\n${aggregation.highRiskModules.size}\n\n`;
      markdown += `Circular dependencies:\n${aggregation.circularDependencies}\n\n`;
      markdown += `Related tests:\n${aggregation.relatedTests.size}\n\n`;

      if (aggregation.explanations.length > 0) {
        markdown += `### Detailed Explanations\n`;
        for (const exp of aggregation.explanations) {
          markdown += `- **${exp.file}** (${exp.risk}): ${exp.explanation}\n`;
        }
      }

      console.log(markdown);

      await postGitHubComment(markdown);

    } catch (error: any) {
      console.error(formatErrorForDX(error, options.verbose));
      process.exit(1);
    }
  });
