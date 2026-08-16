import { config } from 'dotenv';
import { z } from 'zod';
import { ConfigError } from './errors';
import { logger } from './logger';

export const EnvSchema = z.object({
  OPENAI_API_KEY: z.string().optional(),
  DATABASE_URL: z.string().default('sqlite://codeatlas.db'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type EnvConfig = z.infer<typeof EnvSchema>;

let cachedEnv: EnvConfig | null = null;

export function loadConfig(): EnvConfig {
  if (cachedEnv) return cachedEnv;

  config();

  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    logger.error('Invalid environment configuration', parsed.error.format());
    throw new ConfigError('Invalid environment configuration', parsed.error.format());
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}
