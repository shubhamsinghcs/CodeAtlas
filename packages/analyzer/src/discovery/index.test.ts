import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { discoverRepository } from './index';

describe('Repository Discovery', () => {
  const fixturePath = path.resolve(__dirname, '../../__fixtures__/sample-repo');

  it('should detect local git repository and extract metadata', async () => {
    const result = await discoverRepository(fixturePath);

    expect(result.type).toBe('local_git');
    expect(result.localPath).toBe(fixturePath);
    expect(result.commitHash).toBeDefined();

    // Check files
    expect(result.files.length).toBe(4);

    const filePaths = result.files.map((f) => f.path);
    expect(filePaths).toContain('index.ts');
    expect(filePaths).toContain('index.test.ts');
    expect(filePaths).toContain('utils.js');
    expect(filePaths).toContain('script.py');

    // Ignored paths check
    expect(filePaths).not.toContain('node_modules/ignored.ts');
    expect(filePaths).not.toContain('dist/built.js');

    // Language and test status check
    const tsFile = result.files.find((f) => f.path === 'index.ts');
    expect(tsFile?.language).toBe('ts');
    expect(tsFile?.isTest).toBe(false);

    const testFile = result.files.find((f) => f.path === 'index.test.ts');
    expect(testFile?.language).toBe('ts');
    expect(testFile?.isTest).toBe(true);

    const pyFile = result.files.find((f) => f.path === 'script.py');
    expect(pyFile?.language).toBe('py');
    expect(pyFile?.isTest).toBe(false);

    // Sizes
    expect(result.totalSize).toBeGreaterThan(0);
    expect(result.totalLines).toBeGreaterThan(0);
  });

  it('should throw for unsupported inputs', async () => {
    await expect(discoverRepository('https://google.com')).rejects.toThrow('Unsupported input format');
    await expect(discoverRepository('/path/that/does/not/exist/123')).rejects.toThrow(
      'does not exist',
    );
  });

  it('should clone and discover github repository', async () => {
    try {
      const result = await discoverRepository('https://github.com/octocat/Hello-World.git');
      expect(result.type).toBe('github_url');
      expect(result.originalUrl).toBe('https://github.com/octocat/Hello-World.git');
      expect(result.commitHash).toBeDefined();
      expect(result.localPath).toContain('codeatlas-cache');
    } catch (e: any) {
      if (e.name === 'EmptyRepositoryError') {
        expect(e.message).toContain('No supported source files');
      } else {
        throw e;
      }
    }
  }, 10000);

  it('should respect .codeatlasignore patterns and default ignores', async () => {
    const ignoreFixturePath = path.resolve(__dirname, '../../__fixtures__/sample-ignore');
    const result = await discoverRepository(ignoreFixturePath);

    expect(result.type).toBe('local_dir');
    
    const filePaths = result.files.map((f) => f.path);
    
    // Should include unignored files
    expect(filePaths).toContain('index.ts');
    expect(filePaths).toContain('nested/keep.ts');

    // Should NOT include ignored files
    expect(filePaths).not.toContain('vendor/ignored.ts');
    expect(filePaths).not.toContain('file.generated.ts');

    // Vendor dir and generated.ts were skipped. Note: ignore library tracks hits to directories.
    expect(result.ignoredCount).toBeGreaterThanOrEqual(2);
  });
});
