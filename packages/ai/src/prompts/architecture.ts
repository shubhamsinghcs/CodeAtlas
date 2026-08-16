import { z } from 'zod';
import { generateStructuredJson } from '../provider';
import { DatabaseClient } from '@codeatlas/database';

export const ArchitectureSummarySchema = z.object({
  purpose: z.string().describe("Repository purpose"),
  majorModules: z.array(z.string()).describe("Major modules"),
  architectureStyle: z.string().describe("Architecture style"),
  importantDependencies: z.array(z.string()).describe("Important dependencies"),
  entryPoints: z.array(z.string()).describe("Entry points"),
  testingStructure: z.string().describe("Testing structure"),
  highRiskAreas: z.array(z.string()).describe("High-risk areas"),
});

export type ArchitectureSummary = z.infer<typeof ArchitectureSummarySchema>;

export async function generateArchitectureSummary(
  dbClient: DatabaseClient,
  repoDataStr: string,
  repositoryId: string,
  commitHash: string
): Promise<ArchitectureSummary | null> {
  const prompt = `Analyze the following CodeAtlas repository data and provide an architecture summary.\n\nRepository Data:\n${repoDataStr}`;
  
  return generateStructuredJson(dbClient, prompt, ArchitectureSummarySchema, {
    repositoryId,
    commitHash,
    analysisType: 'architecture_summary',
    model: '', // Inherited from config
    schemaVersion: '1.0',
  });
}
