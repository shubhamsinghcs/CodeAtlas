#!/usr/bin/env node
import { Command } from 'commander';
import pc from 'picocolors';
import { analyzeCommand } from './commands/analyze';
import { serveCommand } from './commands/serve';
import { reportCommand } from './commands/report';
import { impactCommand } from './commands/impact';
import { mcpCommand } from './commands/mcp';
import { hotspotsCommand } from './commands/hotspots';
import { doctorCommand } from './commands/doctor';

const program = new Command();

program
  .name('codeatlas')
  .description(pc.cyan('CodeAtlas - Give your AI coding agent a map before it edits your code.'))
  .version('0.1.0');

program.addCommand(analyzeCommand);
program.addCommand(serveCommand);
program.addCommand(reportCommand);
program.addCommand(impactCommand);
program.addCommand(mcpCommand);
program.addCommand(hotspotsCommand);
program.addCommand(doctorCommand);

program.parse(process.argv);
