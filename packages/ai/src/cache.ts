import { DatabaseClient, schema } from '@codeatlas/database';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

export interface CacheContext {
  repositoryId: string;
  commitHash: string;
  analysisType: string;
  model: string;
  schemaVersion: string;
}

export async function getCachedResponse(dbClient: DatabaseClient, context: CacheContext, prompt: string): Promise<string | null> {
  const promptHash = crypto.createHash('sha256').update(prompt).digest('hex');

  const result = await dbClient.db.select().from(schema.aiCache).where(
    and(
      eq(schema.aiCache.repositoryId, context.repositoryId),
      eq(schema.aiCache.commitHash, context.commitHash),
      eq(schema.aiCache.analysisType, context.analysisType),
      eq(schema.aiCache.model, context.model),
      eq(schema.aiCache.schemaVersion, context.schemaVersion),
      eq(schema.aiCache.promptHash, promptHash)
    )
  ).limit(1);

  if (result.length > 0) {
    return result[0].responseJson;
  }
  return null;
}

export async function setCachedResponse(dbClient: DatabaseClient, context: CacheContext, prompt: string, responseJson: string): Promise<void> {
  const promptHash = crypto.createHash('sha256').update(prompt).digest('hex');
  const id = crypto.randomUUID();

  await dbClient.db.insert(schema.aiCache).values({
    id,
    repositoryId: context.repositoryId,
    commitHash: context.commitHash,
    analysisType: context.analysisType,
    model: context.model,
    schemaVersion: context.schemaVersion,
    promptHash,
    responseJson,
    createdAt: new Date(),
  });
}
