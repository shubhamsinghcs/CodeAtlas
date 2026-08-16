import * as fs from 'fs';
import * as path from 'path';
import { FileInfo, Language } from './types';

const DEFAULT_IGNORED_DIRS = [
  '.git',
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.next',
  '__pycache__',
  '.venv',
];

const SUPPORTED_EXTENSIONS: Record<string, Language> = {
  '.ts': 'ts',
  '.tsx': 'tsx',
  '.js': 'js',
  '.jsx': 'jsx',
  '.mjs': 'mjs',
  '.cjs': 'cjs',
  '.py': 'py',
};

function isTestFile(filePath: string): boolean {
  const parts = filePath.split(path.sep);
  const fileName = parts[parts.length - 1];

  if (parts.includes('__tests__') || parts.includes('tests') || parts.includes('test')) {
    return true;
  }

  return !!fileName.match(/(\.test\.|\.spec\.|_test\.)/i);
}

function countLines(filePath: string): number {
  try {
    const buffer = fs.readFileSync(filePath);
    let lines = 0;
    for (let i = 0; i < buffer.length; i++) {
      if (buffer[i] === 10) {
        // \n
        lines++;
      }
    }
    // If the file is not empty and doesn't end with a newline, the last line doesn't have a \n
    return buffer.length > 0 ? lines + 1 : 0;
  } catch {
    return 0;
  }
}

export function walkRepository(repoPath: string, ignoredPaths: string[] = []): FileInfo[] {
  const files: FileInfo[] = [];
  const ignoredSet = new Set([...DEFAULT_IGNORED_DIRS, ...ignoredPaths]);

  function walk(currentDir: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (ignoredSet.has(entry.name)) {
        continue;
      }

      const absolutePath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        walk(absolutePath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();

        // Check if supported extension
        if (ext in SUPPORTED_EXTENSIONS) {
          const relativePath = path.relative(repoPath, absolutePath);
          const stats = fs.statSync(absolutePath);

          files.push({
            path: relativePath.split(path.sep).join('/'), // Normalize to posix for cross-platform consistency
            absolutePath,
            size: stats.size,
            lineCount: countLines(absolutePath),
            language: SUPPORTED_EXTENSIONS[ext]!,
            isTest: isTestFile(relativePath),
          });
        }
      }
    }
  }

  walk(repoPath);
  return files;
}
