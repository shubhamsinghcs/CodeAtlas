import { describe, it, expect, vi } from 'vitest';

// Mock DatabaseClient before any imports that transitively open codeatlas.db
vi.mock('@codeatlas/database', () => ({
  DatabaseClient: vi.fn().mockImplementation(() => ({
    db: { select: vi.fn(), insert: vi.fn().mockReturnThis(), pragma: vi.fn() },
    init: vi.fn(),
  })),
  schema: {},
}));

import { analyzeCommand } from './commands/analyze';
import { serveCommand } from './commands/serve';
import { reportCommand } from './commands/report';
import { impactCommand } from './commands/impact';
import { mcpCommand } from './commands/mcp';

// Basic sanity checks to ensure commands are configured correctly
describe('CLI Commands Configuration', () => {
  it('should have analyze command configured', () => {
    expect(analyzeCommand.name()).toBe('analyze');
    expect(analyzeCommand.description()).toContain('Analyze a repository');
  });

  it('should have serve command configured', () => {
    expect(serveCommand.name()).toBe('serve');
    expect(serveCommand.description()).toContain('server');
    const portOption = serveCommand.options.find((o) => o.short === '-p');
    expect(portOption).toBeDefined();
  });

  it('should have report command configured', () => {
    expect(reportCommand.name()).toBe('report');
    expect(reportCommand.description()).toContain('Markdown report');
  });

  it('should have impact command configured', () => {
    expect(impactCommand.name()).toBe('impact');
    expect(impactCommand.description()).toContain('change-impact');
  });

  it('should have mcp command configured', () => {
    expect(mcpCommand.name()).toBe('mcp');
    expect(mcpCommand.description()).toContain('MCP');
  });
});
