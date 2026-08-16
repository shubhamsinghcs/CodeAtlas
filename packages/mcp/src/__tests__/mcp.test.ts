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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(toolsModule.dbClient.db, 'select').mockReturnValue({
      from: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 'run1', repositoryId: 'repo1', commitId: 'commit1' }]),
    } as any);
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

      const resultStr = await handlePlanChange('Add user authentication');
      const result = JSON.parse(resultStr);
      expect(result.note).toContain('AI provider not configured');
      expect(result.goal).toBe('Add user authentication');
    });

    it('calls AI when configured', async () => {
      vi.mocked(aiModule.getAiConfig).mockReturnValue({ provider: 'test', baseUrl: 'http://test' });
      vi.mocked(aiModule.generateFeaturePlan).mockResolvedValue({
        goal: "Mock AI Plan",
        repositoryAreas: [],
        filesToInspect: [],
        filesToModify: [],
        existingPatterns: [],
        tests: [],
        risks: [],
        orderedSteps: []
      });

      const resultStr = await handlePlanChange('Add user authentication');
      const result = JSON.parse(resultStr);
      expect(result.goal).toBe("Mock AI Plan");
    });
  });
});
