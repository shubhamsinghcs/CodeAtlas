import { describe, it, expect } from 'vitest';
import { formatErrorForDX } from './errors';
import { GitNotFoundError, EmptyRepositoryError } from '@codeatlas/shared';
import pc from 'picocolors';

describe('Error Formatter (DX)', () => {
  it('formats an unknown error correctly', () => {
    const error = new Error('Something broke');
    const output = formatErrorForDX(error, false);
    expect(output).toContain('WHAT:');
    expect(output).toContain('An unexpected error occurred');
    expect(output).toContain('WHY:');
    expect(output).toContain('Something broke');
    expect(output).toContain('HOW TO FIX IT:');
    expect(output).toContain('Run with --verbose for full stack trace');
  });

  it('formats a GitNotFoundError correctly', () => {
    const error = new GitNotFoundError();
    const output = formatErrorForDX(error, false);
    expect(output).toContain('Git is not installed or not in PATH');
    expect(output).toContain('Install Git from https://git-scm.com/downloads');
  });

  it('formats an EmptyRepositoryError correctly', () => {
    const error = new EmptyRepositoryError('No files');
    const output = formatErrorForDX(error, false);
    expect(output).toContain('No supported source files found');
    expect(output).toContain('The repository contains zero files');
    expect(output).toContain('currently only supports TypeScript, JavaScript, and Python');
  });

  it('includes stack trace in verbose mode', () => {
    const error = new Error('Test');
    error.stack = 'Error: Test\\n  at doSomething (test.js:1:1)';
    const output = formatErrorForDX(error, true);
    expect(output).toContain('--- STACK TRACE ---');
    expect(output).toContain('at doSomething');
    expect(output).not.toContain('Run with --verbose');
  });
});
