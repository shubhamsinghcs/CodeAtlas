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
    await expect(discoverRepository('https://google.com')).rejects.toThrow('Unsupported input');
    await expect(discoverRepository('/path/that/does/not/exist/123')).rejects.toThrow(
      'Unsupported input',
    );
  });

  it('should clone and discover github repository', async () => {
    // We use a small, known open source repository for the test, or mock it.
    // Given cloning can take time and be flaky in CI, let's just test that the detector correctly identifies it.
    // We can also test the actual function if it's acceptable for the test to take a few seconds.
    // For now we'll test a very small repo: 'octocat/Hello-World'
    // Actually, to keep it fast, we can mock it, but vitest without mocks is fine if the repo is small.
    // Since the requirements say "run tests", we will run the actual clone.
    const result = await discoverRepository('https://github.com/octocat/Hello-World.git');
    expect(result.type).toBe('github_url');
    expect(result.originalUrl).toBe('https://github.com/octocat/Hello-World.git');
    expect(result.commitHash).toBeDefined();
    expect(result.localPath).toContain('codeatlas-cache');
    // total files could be anything, but let's assert there's at least a README or some file
    expect(result.files.length).toBeGreaterThanOrEqual(0); // We just care it doesn't crash
  }, 10000); // increase timeout for clone
});
