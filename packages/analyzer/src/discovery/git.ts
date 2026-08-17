import * as child_process from 'child_process';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { NetworkFailureError, GitNotFoundError } from '@codeatlas/shared';

export function getGitCommitHash(repoPath: string): string | undefined {
  try {
    const output = child_process.execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: repoPath,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return output.trim();
  } catch {
    return undefined;
  }
}

export function findGitRoot(currentPath: string): string | undefined {
  try {
    const output = child_process.execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd: currentPath,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return path.normalize(output.trim());
  } catch {
    return undefined;
  }
}

export function cloneGithubRepository(url: string): string {
  // Create a predictable cache directory based on the URL
  const hash = crypto.createHash('sha256').update(url).digest('hex').slice(0, 12);
  const cacheBaseDir = path.join(os.tmpdir(), 'codeatlas-cache');
  const targetDir = path.join(cacheBaseDir, hash);

  if (!fs.existsSync(cacheBaseDir)) {
    fs.mkdirSync(cacheBaseDir, { recursive: true });
  }

  // If it already exists, we could just do git pull, but for simplicity and safety,
  // let's just make sure we either clone fresh or return the existing one.
  // Actually, doing git fetch & pull ensures we have the latest.
  if (fs.existsSync(targetDir)) {
    try {
      child_process.execFileSync('git', ['fetch', '--all'], {
        cwd: targetDir,
        stdio: 'ignore',
      });
      child_process.execFileSync('git', ['reset', '--hard', 'origin/HEAD'], {
        cwd: targetDir,
        stdio: 'ignore',
      });
      return targetDir;
    } catch {
      // If updating fails, try to remove and re-clone. On Windows, another
      // parallel process may hold a lock (EBUSY), in which case we skip
      // removal and attempt to use the existing directory.
      try {
        fs.rmSync(targetDir, { recursive: true, force: true });
      } catch {
        // Ignore EBUSY / lock errors from parallel test workers on Windows
      }
    }
  }

  try {
    child_process.execFileSync('git', ['clone', url, targetDir], {
      stdio: 'ignore',
    });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new GitNotFoundError();
    }
    throw new NetworkFailureError(`Failed to clone GitHub repository: ${url}. Verify network connectivity and access rights.`);
  }

  return targetDir;
}

export class GitHistoryCollector {
  private repoPath: string;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
  }

  public collect(filePaths: string[]): Map<string, import('./types').GitMetrics> {
    const results = new Map<string, import('./types').GitMetrics>();
    if (filePaths.length === 0) return results;

    try {
      // Get log with commit date and author
      const output = child_process.execFileSync(
        'git',
        ['log', '--name-only', '--format=COMMIT|%aI|%aN'],
        {
          cwd: this.repoPath,
          encoding: 'utf-8',
          maxBuffer: 1024 * 1024 * 50, // 50MB
        }
      );

      const lines = output.split(/\r?\n/);
      let currentTimestamp = 0;
      let currentAuthor = '';

      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

      // Temporary storage per file to aggregate data
      const fileStats = new Map<string, {
        commitCount: number;
        authors: Set<string>;
        recentMods: number;
        lastModified: number;
      }>();

      for (const line of lines) {
        if (!line.trim()) continue;

        if (line.startsWith('COMMIT|')) {
          const parts = line.split('|');
          const dateStr = parts[1];
          currentAuthor = parts[2] || 'unknown';
          currentTimestamp = new Date(dateStr).getTime();
          continue;
        }

        // It's a file path modified in this commit
        const filePath = line.trim();
        let stats = fileStats.get(filePath);
        if (!stats) {
          stats = {
            commitCount: 0,
            authors: new Set<string>(),
            recentMods: 0,
            lastModified: currentTimestamp, // first seen is most recent because `git log` is reverse chronological
          };
          fileStats.set(filePath, stats);
        }

        stats.commitCount++;
        stats.authors.add(currentAuthor);
        if (currentTimestamp > thirtyDaysAgo) {
          stats.recentMods++;
        }
        // Since git log is reverse chronological, the first time we see the file is its last modification.
        if (currentTimestamp > stats.lastModified) {
          stats.lastModified = currentTimestamp;
        }
      }

      // Convert temporary stats to GitMetrics for only the requested files
      const requestedSet = new Set(filePaths);
      
      for (const [filePath, stats] of fileStats.entries()) {
        if (requestedSet.has(filePath)) {
          let churn: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
          if (stats.recentMods > 5) {
            churn = 'HIGH';
          } else if (stats.recentMods >= 2) {
            churn = 'MEDIUM';
          }

          results.set(filePath, {
            commitCount: stats.commitCount,
            authorCount: stats.authors.size,
            recentModifications: stats.recentMods,
            lastModified: stats.lastModified,
            churn
          });
        }
      }
    } catch (e) {
      // If git log fails, we just return empty results
    }

    return results;
  }
}
