import { z } from 'zod';

export const RepositoryConfigSchema = z.object({
  repositoryUrl: z.string().url().optional(),
  localPath: z.string().optional(),
  branch: z.string().default('main'),
});

export type RepositoryConfig = z.infer<typeof RepositoryConfigSchema>;
