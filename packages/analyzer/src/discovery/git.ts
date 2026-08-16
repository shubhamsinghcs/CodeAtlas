import * as child_process from 'child_process';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

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
      // If updating fails, remove it and clone again
      fs.rmSync(targetDir, { recursive: true, force: true });
    }
  }

  try {
    child_process.execFileSync('git', ['clone', url, targetDir], {
      stdio: 'ignore',
    });
  } catch (error) {
    throw new Error(`Failed to clone GitHub repository: ${url}`, { cause: error });
  }

  return targetDir;
}
