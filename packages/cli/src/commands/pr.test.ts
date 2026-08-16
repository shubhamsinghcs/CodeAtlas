import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as child_process from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

describe('PR Impact Command', () => {
  const testRepo = path.join(__dirname, '__test_pr_repo_' + Math.random().toString(36).slice(2));
  const cliPath = path.resolve(__dirname, '../../dist/index.js');

  beforeAll(() => {
    // Setup a dummy git repository
    if (fs.existsSync(testRepo)) {
      fs.rmSync(testRepo, { recursive: true, force: true });
    }
    fs.mkdirSync(testRepo, { recursive: true });

    child_process.execSync('git init', { cwd: testRepo });
    child_process.execSync('git config user.name "Test"', { cwd: testRepo });
    child_process.execSync('git config user.email "test@example.com"', { cwd: testRepo });

    // Initial commit
    fs.writeFileSync(path.join(testRepo, 'a.ts'), 'export const a = 1;');
    fs.writeFileSync(path.join(testRepo, 'b.ts'), 'import { a } from "./a"; export const b = a + 1;');
    child_process.execSync('git add .', { cwd: testRepo });
    child_process.execSync('git commit -m "initial"', { cwd: testRepo });

    // Analyze first
    child_process.execSync(`node ${cliPath} analyze .`, { cwd: testRepo });

    // Modify a file
    fs.writeFileSync(path.join(testRepo, 'a.ts'), 'export const a = 2;');
    child_process.execSync('git add .', { cwd: testRepo });
    child_process.execSync('git commit -m "update a"', { cwd: testRepo });
  });

  afterAll(() => {
    if (fs.existsSync(testRepo)) {
      fs.rmSync(testRepo, { recursive: true, force: true });
    }
  });

  it('should analyze PR impact and output markdown', () => {
    const output = child_process.execSync(`node ${cliPath} pr --base HEAD~1 --head HEAD`, {
      cwd: testRepo,
      encoding: 'utf-8'
    });

    expect(output).toContain('## CodeAtlas Impact');
    expect(output).toContain('Changed:\n1 files');
  });

  it('should exit cleanly if no changed files', () => {
    const output = child_process.execSync(`node ${cliPath} pr --base HEAD --head HEAD`, {
      cwd: testRepo,
      encoding: 'utf-8'
    });

    expect(output).toContain('No changed files detected.');
  });
});
