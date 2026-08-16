import { z } from 'zod';
import { generateStructuredJson } from '../provider';
import { DatabaseClient } from '@codeatlas/database';

export const FeatureImplementationPlanSchema = z.object({
  goal: z.string(),
  repositoryAreas: z.array(z.string()),
  filesToInspect: z.array(z.string()),
  filesToModify: z.array(z.string()),
  existingPatterns: z.array(z.string()),
  tests: z.array(z.string()),
  risks: z.array(z.string()),
  orderedSteps: z.array(z.string()),
});

export type FeatureImplementationPlan = z.infer<typeof FeatureImplementationPlanSchema>;

export async function generateFeaturePlan(
  dbClient: DatabaseClient,
  featureRequest: string,
  contextDataStr: string,
  repositoryId: string,
  commitHash: string
): Promise<FeatureImplementationPlan | null> {
  const prompt = `Based on the following repository context, create an implementation plan for this feature: "${featureRequest}"\n\nRepository Context:\n${contextDataStr}`;
  
  return generateStructuredJson(dbClient, prompt, FeatureImplementationPlanSchema, {
    repositoryId,
    commitHash,
    analysisType: 'feature_plan',
    model: '',
    schemaVersion: '1.0',
  });
}
