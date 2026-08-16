import * as fs from 'fs';
import * as path from 'path';
import ignore from 'ignore';
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

export function walkRepository(
  repoPath: string,
  ignoredPaths: string[] = [],
): { files: FileInfo[]; ignoredCount: number } {
  const files: FileInfo[] = [];
  let ignoredCount = 0;

  const ig = ignore();
  ig.add(DEFAULT_IGNORED_DIRS);
  if (ignoredPaths.length > 0) {
    ig.add(ignoredPaths);
  }

  const ignoreFilePath = path.join(repoPath, '.codeatlasignore');
  if (fs.existsSync(ignoreFilePath)) {
    try {
      const content = fs.readFileSync(ignoreFilePath, 'utf-8');
      ig.add(content);
    } catch {
      // If we can't read it, fail silently
    }
  }

  function walk(currentDir: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name);
      let relativePath = path.relative(repoPath, absolutePath).split(path.sep).join('/');

      if (entry.isDirectory()) {
        relativePath += '/';
      }

      if (ig.ignores(relativePath)) {
        ignoredCount++;
        continue;
      }

      if (entry.isDirectory()) {
        walk(absolutePath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();

        // Check if supported extension
        if (ext in SUPPORTED_EXTENSIONS) {
          const stats = fs.statSync(absolutePath);

          files.push({
            path: relativePath, // Already normalized
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
  return { files, ignoredCount };
}
