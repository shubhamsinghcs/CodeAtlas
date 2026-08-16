import { Command } from 'commander';
import { startMcpServer } from '@codeatlas/mcp';
import pc from 'picocolors';

export const mcpCommand = new Command('mcp')
  .description('Start the Model Context Protocol (MCP) server')
  .option('-p, --port <number>', 'Port to run the MCP server on (SSE)', undefined)
  .option('--stdio', 'Run over standard input/output (disables logs)')
  .action((options) => {
    if (!options.stdio) {
      console.log(pc.blue('Starting CodeAtlas MCP server...'));
    }
    const port = options.port ? parseInt(options.port, 10) : undefined;
    startMcpServer({ port, stdio: options.stdio || !port });
  });
