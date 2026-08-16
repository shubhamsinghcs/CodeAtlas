import { z } from 'zod';
import { generateStructuredJson } from '../provider';
import { DatabaseClient } from '@codeatlas/database';

export const ExistingPatternSchema = z.object({
  filePath: z.string(),
  reason: z.string(),
  relatedTests: z.array(z.string()),
  architecturalModule: z.string(),
});

export type ExistingPattern = z.infer<typeof ExistingPatternSchema>;

export const FeatureImplementationPlanSchema = z.object({
  userGoal: z.string(),
  repositoryAreas: z.array(z.string()),
  filesToInspect: z.array(z.string()),
  recommendedFiles: z.array(z.string()),
  existingPatterns: z.array(ExistingPatternSchema),
  testsToAdd: z.array(z.string()),
  risks: z.array(z.string()),
  implementationOrder: z.array(z.string()),
});

export type FeatureImplementationPlan = z.infer<typeof FeatureImplementationPlanSchema>;

export async function generateFeaturePlan(
  dbClient: DatabaseClient,
  featureRequest: string,
  contextDataStr: string,
  repositoryId: string,
  commitHash: string
): Promise<FeatureImplementationPlan | null> {
  const prompt = `Based on the following repository context, create an implementation plan for this feature: "${featureRequest}"\n\nSearch the repository for related implementations to find existing patterns. Only report patterns actually found. Never fabricate information.\n\nRepository Context:\n${contextDataStr}`;
  
  return generateStructuredJson(dbClient, prompt, FeatureImplementationPlanSchema, {
    repositoryId,
    commitHash,
    analysisType: 'feature_plan',
    model: '',
    schemaVersion: '1.0',
  });
}
