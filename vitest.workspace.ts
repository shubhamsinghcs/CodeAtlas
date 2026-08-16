import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/*',
  'apps/*',
  {
    test: {
      globals: true,
      environment: 'node',
      exclude: ['**/node_modules/**', '**/dist/**', '**/__fixtures__/**'],
    },
  },
]);
