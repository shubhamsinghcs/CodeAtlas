import { z } from 'zod';

export const AIConfigSchema = z.object({
  provider: z.string().optional(),
  baseUrl: z.string().optional(),
  apiKey: z.string().optional(),
  model: z.string().optional(),
});

export type AIConfig = z.infer<typeof AIConfigSchema>;

export function getAiConfig(): AIConfig {
  return {
    provider: process.env.AI_PROVIDER,
    baseUrl: process.env.AI_BASE_URL,
    apiKey: process.env.AI_API_KEY,
    model: process.env.AI_MODEL,
  };
}
