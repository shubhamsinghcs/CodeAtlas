import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { 
  tools, 
  handleSearchSymbols, 
  handleGetFileContext, 
  handleGetImpact, 
  handleGetArchitecture, 
  handlePlanChange 
} from './tools';

export async function startMcpServer(options: { port?: number; stdio?: boolean } = {}) {
  const server = new Server(
    {
      name: 'codeatlas-mcp',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
    try {
      const req = request as { params: { name: string, arguments: Record<string, unknown> } };
      if (req.params.name === 'codeatlas_search_symbols') {
        const result = await handleSearchSymbols(req.params.arguments?.query as string);
        return { content: [{ type: 'text', text: result }] };
      }
      if (req.params.name === 'codeatlas_get_file_context') {
        const result = await handleGetFileContext(req.params.arguments?.path as string);
        return { content: [{ type: 'text', text: result }] };
      }
      if (req.params.name === 'codeatlas_get_impact') {
        const result = await handleGetImpact(req.params.arguments?.path as string);
        return { content: [{ type: 'text', text: result }] };
      }
      if (req.params.name === 'codeatlas_get_architecture') {
        const result = await handleGetArchitecture();
        return { content: [{ type: 'text', text: result }] };
      }
      if (req.params.name === 'codeatlas_plan_change') {
        const result = await handlePlanChange(req.params.arguments?.featureRequest as string);
        return { content: [{ type: 'text', text: result }] };
      }

      throw new Error(`Unknown tool: ${req.params.name}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Error executing ${name}: ${err.message}` }],
      };
    }
  });

  if (options.stdio || !options.port) {
    // Run over stdio
    const transport = new StdioServerTransport();
    await server.connect(transport);
  } else {
    // A future update would mount the SSE transport to the port here.
    // For now, if port is passed but not stdio, we just throw or log since
    // SSE is usually mounted into an express app.
    console.log(`[MCP] SSE Transport on port ${options.port} is not yet implemented natively in standalone mode.`);
  }
}
