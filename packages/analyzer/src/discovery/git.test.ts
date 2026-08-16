import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as child_process from 'child_process';
import { GitHistoryCollector } from './git';

vi.mock('child_process');

describe('GitHistoryCollector', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should parse git log output and calculate metrics correctly', () => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const oldTimestamp = Date.now() - 60 * 24 * 60 * 60 * 1000;

    const recentDateStr = new Date(thirtyDaysAgo + 1000000).toISOString();
    const oldDateStr = new Date(oldTimestamp).toISOString();

    const mockOutput = `COMMIT|${recentDateStr}|Alice
src/api/auth.ts
src/utils/math.ts

COMMIT|${recentDateStr}|Bob
src/api/auth.ts

COMMIT|${oldDateStr}|Charlie
src/api/auth.ts
src/core/engine.ts
`;

    vi.mocked(child_process.execFileSync).mockReturnValue(mockOutput);

    const collector = new GitHistoryCollector('/mock/repo');
    const result = collector.collect(['src/api/auth.ts', 'src/utils/math.ts', 'src/core/engine.ts', 'src/ignored.ts']);

    expect(child_process.execFileSync).toHaveBeenCalledWith(
      'git',
      ['log', '--name-only', '--format=COMMIT|%aI|%aN'],
      expect.any(Object)
    );

    // src/api/auth.ts: 3 commits (2 recent, 1 old), 3 authors (Alice, Bob, Charlie)
    const authMetrics = result.get('src/api/auth.ts')!;
    expect(authMetrics).toBeDefined();
    expect(authMetrics.commitCount).toBe(3);
    expect(authMetrics.authorCount).toBe(3);
    expect(authMetrics.recentModifications).toBe(2);
    expect(authMetrics.churn).toBe('MEDIUM'); // 2 recent mods = MEDIUM

    // src/utils/math.ts: 1 commit (recent), 1 author (Alice)
    const mathMetrics = result.get('src/utils/math.ts')!;
    expect(mathMetrics).toBeDefined();
    expect(mathMetrics.commitCount).toBe(1);
    expect(mathMetrics.authorCount).toBe(1);
    expect(mathMetrics.recentModifications).toBe(1);
    expect(mathMetrics.churn).toBe('LOW'); // < 2 recent mods = LOW

    // src/core/engine.ts: 1 commit (old), 1 author (Charlie)
    const engineMetrics = result.get('src/core/engine.ts')!;
    expect(engineMetrics).toBeDefined();
    expect(engineMetrics.commitCount).toBe(1);
    expect(engineMetrics.authorCount).toBe(1);
    expect(engineMetrics.recentModifications).toBe(0);
    expect(engineMetrics.churn).toBe('LOW');

    // src/ignored.ts: no commits
    expect(result.has('src/ignored.ts')).toBe(false);
  });

  it('should return empty map if execFileSync throws', () => {
    vi.mocked(child_process.execFileSync).mockImplementation(() => {
      throw new Error('git failed');
    });

    const collector = new GitHistoryCollector('/mock/repo');
    const result = collector.collect(['src/file.ts']);

    expect(result.size).toBe(0);
  });
});
