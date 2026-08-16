import { describe, it, expect, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { generateSyntheticFixture } from './generate';

const TEMP_DIR = path.join(__dirname, 'test-tmp');

describe('Benchmark Fixture Generator', () => {
  afterAll(() => {
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }
  });

  it('should generate a small typescript monorepo correctly', () => {
    const repoPath = generateSyntheticFixture({
      size: 'small',
      language: 'typescript',
      isMonorepo: true,
      baseDir: TEMP_DIR
    });

    expect(fs.existsSync(repoPath)).toBe(true);

    // Check monorepo structure
    expect(fs.existsSync(path.join(repoPath, 'packages/pkg-a'))).toBe(true);
    expect(fs.existsSync(path.join(repoPath, 'packages/pkg-b'))).toBe(true);
    expect(fs.existsSync(path.join(repoPath, 'apps/web'))).toBe(true);

    // Check files inside pkg-a
    const pkgA = path.join(repoPath, 'packages/pkg-a');
    // small config is 100 files across 3 packages = ~33 files
    // small config is 10 dirs across 3 packages = ~3 dirs
    const dir0 = path.join(pkgA, 'dir_0');
    expect(fs.existsSync(dir0)).toBe(true);
    const files = fs.readdirSync(dir0);
    expect(files.length).toBeGreaterThan(0);
    expect(files[0].endsWith('.ts')).toBe(true);

    // Verify content has imports and exports
    const content = fs.readFileSync(path.join(dir0, files[0]), 'utf-8');
    expect(content).toContain('export function func_');
  });

  it('should generate a medium python single repo correctly', () => {
    const repoPath = generateSyntheticFixture({
      size: 'medium',
      language: 'python',
      isMonorepo: false,
      baseDir: TEMP_DIR
    });

    expect(fs.existsSync(repoPath)).toBe(true);
    
    // Check single repo structure (pkg is '.')
    const dir0 = path.join(repoPath, 'dir_0');
    expect(fs.existsSync(dir0)).toBe(true);
    const files = fs.readdirSync(dir0);
    expect(files.length).toBeGreaterThan(0);
    expect(files[0].endsWith('.py')).toBe(true);

    // Verify content
    const content = fs.readFileSync(path.join(dir0, files[0]), 'utf-8');
    expect(content).toContain('def func_');
  });
});
