import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runDoctorChecks } from './doctor';
import * as child_process from 'child_process';
import { DatabaseClient } from '@codeatlas/database';

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

vi.mock('@codeatlas/database', () => {
  return {
    DatabaseClient: vi.fn().mockImplementation(() => ({
      init: vi.fn(),
      close: vi.fn(),
    })),
  };
});

describe('Doctor Command', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('passes all checks when environment is healthy', async () => {
    vi.mocked(child_process.execSync).mockImplementation(() => Buffer.from(''));
    process.env.AI_PROVIDER = 'openai';
    process.env.AI_API_KEY = 'sk-test';

    const { allReady, errors, output } = await runDoctorChecks(true);

    expect(allReady).toBe(true);
    expect(errors).toHaveLength(0);
    
    const outputStr = output.join('\n');
    expect(outputStr).toContain('✓ Git');
    expect(outputStr).toContain('✓ Package manager');
    expect(outputStr).toContain('✓ Analyzer');
    expect(outputStr).toContain('✓ Database');
    expect(outputStr).toContain('✓ Provider configured: openai');
    expect(outputStr).toContain('✓ API key configured');
    expect(outputStr).toContain('✓ CodeAtlas is ready.');
  });

  it('fails gracefully when git is missing', async () => {
    vi.mocked(child_process.execSync).mockImplementation((cmd) => {
      if (typeof cmd === 'string' && cmd.includes('git')) {
        throw new Error('Command failed');
      }
      return Buffer.from('');
    });

    const { allReady, errors, output } = await runDoctorChecks(true);

    expect(allReady).toBe(false);
    expect(errors.some(e => e.includes('Install Git'))).toBe(true);
    expect(output.join('\n')).toContain('✗ Git not found');
  });

  it('fails gracefully when database initialization fails', async () => {
    vi.mocked(child_process.execSync).mockImplementation(() => Buffer.from(''));
    
    vi.mocked(DatabaseClient).mockImplementationOnce(() => ({
      init: () => { throw new Error('DB error'); },
      close: vi.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);

    const { allReady, errors, output } = await runDoctorChecks(true);

    expect(allReady).toBe(false);
    expect(errors.some(e => e.includes('Verify SQLite'))).toBe(true);
    expect(output.join('\n')).toContain('✗ Database accessibility failed');
  });

  it('reports no AI config when missing', async () => {
    vi.mocked(child_process.execSync).mockImplementation(() => Buffer.from(''));
    delete process.env.AI_PROVIDER;
    delete process.env.AI_API_KEY;

    const { allReady, output } = await runDoctorChecks(true);

    expect(allReady).toBe(true); // AI is optional
    expect(output.join('\n')).toContain('○ No external AI configured');
  });
});
