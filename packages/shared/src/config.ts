import { config } from 'dotenv';
import { z } from 'zod';
import { ConfigError } from './errors';
import { logger } from './logger';

import * as fs from 'fs';
import * as path from 'path';

export const EnvSchema = z.object({
  OPENAI_API_KEY: z.string().optional(),
  DATABASE_URL: z.string().default('sqlite://codeatlas.db'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type EnvConfig = z.infer<typeof EnvSchema>;

export const ProjectConfigSchema = z.object({
  ignore: z.array(z.string()).optional(),
  analysis: z.object({
    maxDepth: z.number().optional(),
    concurrency: z.number().optional()
  }).optional(),
  ai: z.object({
    provider: z.enum(['openai', 'anthropic', 'mock']).optional()
  }).optional(),
  graph: z.object({
    layout: z.string().optional()
  }).optional(),
  risks: z.object({
    thresholds: z.record(z.number()).optional()
  }).optional()
});

export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;

export interface ResolvedConfig {
  env: EnvConfig;
  project: ProjectConfig;
  merged: {
    ignore: string[];
  };
}

let cachedEnv: EnvConfig | null = null;

export function loadEnvConfig(): EnvConfig {
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

export function loadProjectConfig(workspaceRoot: string): ProjectConfig {
  const configPath = path.join(workspaceRoot, '.codeatlas', 'config.json');
  if (!fs.existsSync(configPath)) {
    return {};
  }
  
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsedJson = JSON.parse(raw);
    const parsed = ProjectConfigSchema.safeParse(parsedJson);
    
    if (!parsed.success) {
      logger.error('Invalid project configuration', parsed.error.format());
      throw new ConfigError('Invalid project configuration in .codeatlas/config.json', parsed.error.format());
    }
    return parsed.data;
  } catch (e: any) {
    if (e instanceof ConfigError) throw e;
    logger.error('Failed to parse .codeatlas/config.json', e.message);
    throw new ConfigError('Failed to parse .codeatlas/config.json', e);
  }
}

export interface CliOptions {
  ignore?: string[];
}

export function resolveConfig(workspaceRoot: string, cliOptions: CliOptions = {}): ResolvedConfig {
  const env = loadEnvConfig();
  const project = loadProjectConfig(workspaceRoot);
  
  // Precedence: CLI -> Project Config -> Defaults
  const mergedIgnore = cliOptions.ignore ?? project.ignore ?? ['node_modules/**', '.git/**'];

  return {
    env,
    project,
    merged: {
      ignore: mergedIgnore
    }
  };
}

