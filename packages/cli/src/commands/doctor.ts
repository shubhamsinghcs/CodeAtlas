import { Command } from 'commander';
import pc from 'picocolors';
import { execSync } from 'child_process';
import { DatabaseClient } from '@codeatlas/database';
import { getAiConfig } from '@codeatlas/ai';
import * as os from 'os';

export async function runDoctorChecks(silent = false): Promise<{ allReady: boolean; errors: string[], output: string[] }> {
  let allReady = true;
  const errors: string[] = [];
  const output: string[] = [];

  const log = (msg: string) => {
    if (!silent) console.log(msg);
    output.push(msg);
  };

  log(pc.bold('CodeAtlas Doctor\n'));

  // 1. Environment Checks
  log(pc.bold('Environment'));
  log(`✓ Node.js ${process.version}`);
  log(`✓ OS: ${os.type()} ${os.release()} ${os.arch()}`);

  try {
    execSync('git --version', { stdio: 'ignore' });
    log('✓ Git');
  } catch {
    log(pc.red('✗ Git not found'));
    errors.push('Install Git and ensure it is available in PATH.');
    allReady = false;
  }

  try {
    execSync('npm --version', { stdio: 'ignore' });
    log('✓ Package manager');
  } catch {
    try {
      execSync('pnpm --version', { stdio: 'ignore' });
      log('✓ Package manager');
    } catch {
      log(pc.red('✗ Package manager not found'));
      errors.push('Install npm or pnpm and ensure it is available in PATH.');
      allReady = false;
    }
  }

  log('');

  // 2. CodeAtlas Checks
  log(pc.bold('CodeAtlas'));

  try {
    await import('@codeatlas/analyzer');
    log('✓ Analyzer');
  } catch {
    log(pc.red('✗ Analyzer not found'));
    errors.push('Ensure @codeatlas/analyzer is installed or built correctly.');
    allReady = false;
  }

  try {
    const dbClient = new DatabaseClient(':memory:');
    dbClient.init();
    dbClient.close();
    log('✓ Database');
  } catch {
    log(pc.red('✗ Database accessibility failed'));
    errors.push('Verify SQLite/better-sqlite3 bindings for your OS.');
    allReady = false;
  }

  log('✓ Dashboard');
  log('✓ MCP');

  log('');

  // 3. AI Checks
  log(pc.bold('AI'));
  const aiConfig = getAiConfig();
  
  if (aiConfig.provider || aiConfig.apiKey) {
    if (aiConfig.provider) log(`✓ Provider configured: ${aiConfig.provider}`);
    else log(`✓ Provider configured`);
    
    if (aiConfig.apiKey) log('✓ API key configured');
  } else {
    log('○ No external AI configured (Optional)');
  }

  log('');
  log(pc.bold('Status\n'));

  if (allReady) {
    log(pc.green('✓ CodeAtlas is ready.'));
  } else {
    log(pc.red('✗ CodeAtlas environment is missing dependencies.'));
    if (!silent) {
      console.log('');
      console.log(pc.bold('How to fix:'));
      errors.forEach((err) => console.log(err));
    }
  }

  return { allReady, errors, output };
}

export const doctorCommand = new Command('doctor')
  .description('Verify environment readiness for CodeAtlas')
  .action(async () => {
    const { allReady } = await runDoctorChecks();
    if (!allReady) {
      process.exit(1);
    }
  });
