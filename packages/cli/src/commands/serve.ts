import { Command } from 'commander';
import { startApiServer } from '../server';

export const serveCommand = new Command('serve')
  .description('Start the local Hono API and dashboard server')
  .option('-p, --port <number>', 'Port to run the server on', '3000')
  .action((options) => {
    const port = parseInt(options.port, 10);
    startApiServer(port);
  });
