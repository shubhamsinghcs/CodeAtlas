import pc from 'picocolors';
import {
  CodeAtlasError,
  GitNotFoundError,
  RepositoryNotFoundError,
  UnsupportedRepositoryError,
  EmptyRepositoryError,
  DatabaseCorruptionError,
  NetworkFailureError,
  ConfigError
} from '@codeatlas/shared';

export function formatErrorForDX(error: unknown, verbose: boolean = false): string {
  let what = 'An unexpected error occurred';
  let why = 'Unknown cause.';
  let fix = 'Please try again or report the issue on GitHub.';

  if (error instanceof Error) {
    why = error.message;

    if (error instanceof GitNotFoundError) {
      what = 'Git is not installed or not in PATH';
      fix = '1. Install Git from https://git-scm.com/downloads\n2. Restart your terminal\n3. Verify by running `git --version`';
    } else if (error instanceof RepositoryNotFoundError) {
      what = 'Target repository not found';
      fix = '1. Check if the path is spelled correctly.\n2. Ensure you have read permissions to the directory.';
    } else if (error instanceof UnsupportedRepositoryError) {
      what = 'Unsupported repository format or URL';
      fix = '1. Verify the URL is a valid GitHub repository (e.g. https://github.com/user/repo).\n2. If analyzing a local directory, ensure it exists.';
    } else if (error instanceof EmptyRepositoryError) {
      what = 'No supported source files found';
      why = 'The repository contains zero files that CodeAtlas can parse.';
      fix = '1. Check your `.codeatlasignore` or `--ignore` flags.\n2. Note that CodeAtlas currently only supports TypeScript, JavaScript, and Python.';
    } else if (error instanceof DatabaseCorruptionError) {
      what = 'Database corruption detected';
      fix = '1. Delete the `codeatlas.db` file in this directory.\n2. Run the analysis again.';
    } else if (error instanceof NetworkFailureError) {
      what = 'Network failure during clone or API request';
      fix = '1. Check your internet connection.\n2. If using GitHub URLs, ensure the repository is public or you have SSH/credential-helper access configured.\n3. If AI features are enabled, verify your API provider is reachable.';
    } else if (error instanceof ConfigError) {
      what = 'Configuration is invalid';
      fix = '1. Check your `.codeatlas/config.json` for syntax errors.\n2. Verify environment variables are correct.';
    } else if (error.name === 'SqliteError') {
      what = 'SQLite database error';
      fix = '1. Delete `codeatlas.db` and retry.\n2. Ensure you have write permissions to the current directory.';
    }
  }

  let output = `\n${pc.red('❌ WHAT:')} ${what}\n\n${pc.yellow('WHY:')} ${why}\n\n${pc.green('HOW TO FIX IT:')}\n${fix}\n`;

  if (verbose && error instanceof Error && error.stack) {
    output += `\n${pc.gray('--- STACK TRACE ---')}\n${pc.gray(error.stack)}\n`;
  } else if (!verbose) {
    output += `\n${pc.gray('(Run with --verbose for full stack trace)')}\n`;
  }

  return output;
}
