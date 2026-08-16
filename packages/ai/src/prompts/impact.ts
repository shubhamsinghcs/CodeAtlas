import { z } from 'zod';
import { generateStructuredJson } from '../provider';
import { DatabaseClient } from '@codeatlas/database';

export const ImpactExplanationSchema = z.object({
  targetFile: z.string(),
  impactScore: z.number().min(0).max(100),
  riskReasons: z.array(z.string()),
  directDependencies: z.array(z.string()),
  directDependents: z.array(z.string()),
  transitiveImpact: z.array(z.string()),
  affectedFiles: z.array(z.string()),
  relatedTests: z.array(z.string()),
  apiRoutes: z.array(z.string()),
  explanation: z.string().describe("A human-readable explanation of what changes if this file is edited"),
});

export type ImpactExplanation = z.infer<typeof ImpactExplanationSchema>;

export async function generateImpactExplanation(
  dbClient: DatabaseClient,
  targetFile: string,
  impactDataStr: string,
  repositoryId: string,
  commitHash: string
): Promise<ImpactExplanation | null> {
  const prompt = `Analyze the following impact analysis data for ${targetFile} and provide a comprehensive explanation of what changes if this file is edited.\n\nImpact Data:\n${impactDataStr}`;
  
  return generateStructuredJson(dbClient, prompt, ImpactExplanationSchema, {
    repositoryId,
    commitHash,
    analysisType: 'impact_explanation',
    model: '',
    schemaVersion: '1.0',
  });
}
