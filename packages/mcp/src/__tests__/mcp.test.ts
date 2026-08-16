import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleGetArchitecture, handlePlanChange } from '../tools';
import * as aiModule from '@codeatlas/ai';
import * as toolsModule from '../tools';

vi.mock('@codeatlas/ai', () => ({
  generateArchitectureSummary: vi.fn(),
  generateFeaturePlan: vi.fn(),
  getAiConfig: vi.fn(),
}));

describe('MCP Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock the DB select chain
    vi.spyOn(toolsModule.dbClient.db as unknown as { select: Function }, 'select').mockReturnValue({
      from: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        { id: 'run1', repositoryId: 'repo1', commitId: 'commit1', path: 'src/auth/login.ts' },
        { id: 'run2', repositoryId: 'repo1', commitId: 'commit1', path: 'src/utils/math.ts' }
      ]),
    });
    vi.spyOn(toolsModule.patternDetector, 'detectPatterns').mockReturnValue([
      { filePath: 'src/auth/login.ts', reason: 'Potential existing pattern', architecturalModule: 'auth', relatedTests: [] }
    ]);
  });

  describe('handleGetArchitecture', () => {
    it('returns deterministic fallback when AI is not configured', async () => {
      vi.mocked(aiModule.getAiConfig).mockReturnValue({});

      const resultStr = await handleGetArchitecture();
      const result = JSON.parse(resultStr);
      expect(result.note).toContain('AI provider not configured');
    });

    it('calls AI when configured', async () => {
      vi.mocked(aiModule.getAiConfig).mockReturnValue({ provider: 'test', baseUrl: 'http://test' });
      vi.mocked(aiModule.generateArchitectureSummary).mockResolvedValue({
        purpose: "Mock AI Architecture",
        majorModules: [],
        architectureStyle: "",
        importantDependencies: [],
        entryPoints: [],
        testingStructure: "",
        highRiskAreas: []
      });

      const resultStr = await handleGetArchitecture();
      const result = JSON.parse(resultStr);
      expect(result.purpose).toBe("Mock AI Architecture");
    });
  });

  describe('handlePlanChange', () => {
    it('returns deterministic fallback when AI is not configured', async () => {
      vi.mocked(aiModule.getAiConfig).mockReturnValue({});

      const resultStr = await handlePlanChange('Add user auth');
      const result = JSON.parse(resultStr);
      expect(result._meta.note).toContain('AI provider not configured');
      expect(result.userGoal).toBe('Add user auth');
      expect(result.existingPatterns[0].filePath).toBe('src/auth/login.ts');
    });

    it('handles repository with no matching patterns', async () => {
      vi.mocked(aiModule.getAiConfig).mockReturnValue({});
      vi.spyOn(toolsModule.patternDetector, 'detectPatterns').mockReturnValue([]);

      const resultStr = await handlePlanChange('Add redis caching mechanism');
      const result = JSON.parse(resultStr);
      expect(result.existingPatterns).toHaveLength(0); // No matching path
    });

    it('calls AI when configured and adds attribution', async () => {
      vi.mocked(aiModule.getAiConfig).mockReturnValue({ provider: 'openai', baseUrl: 'http://test' });
      vi.mocked(aiModule.generateFeaturePlan).mockResolvedValue({
        userGoal: "Mock AI Plan",
        repositoryAreas: [],
        filesToInspect: [],
        recommendedFiles: [],
        existingPatterns: [],
        testsToAdd: [],
        risks: [],
        implementationOrder: []
      });

      const resultStr = await handlePlanChange('Add user authentication');
      const result = JSON.parse(resultStr);
      expect(result.userGoal).toBe("Mock AI Plan");
      expect(result._meta.note).toBe('Generated using openai');
    });

    it('returns error when AI output is malformed or invalid', async () => {
      vi.mocked(aiModule.getAiConfig).mockReturnValue({ provider: 'test', baseUrl: 'http://test' });
      vi.mocked(aiModule.generateFeaturePlan).mockResolvedValue(null);

      const resultStr = await handlePlanChange('Add user authentication');
      const result = JSON.parse(resultStr);
      expect(result.error).toContain('Malformed AI output');
    });
  });
});
