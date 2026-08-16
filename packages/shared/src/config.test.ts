import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { resolveConfig, loadProjectConfig } from './config';

describe('Project Configuration', () => {
  const testDir = path.join(__dirname, '__test_workspace_' + Math.random().toString(36).slice(2));
  const codeatlasDir = path.join(testDir, '.codeatlas');
  const configPath = path.join(codeatlasDir, 'config.json');

  beforeEach(() => {
    if (!fs.existsSync(codeatlasDir)) {
      fs.mkdirSync(codeatlasDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should return empty project config if file does not exist', () => {
    const config = loadProjectConfig(testDir);
    expect(config).toEqual({});
  });

  it('should parse project config from .codeatlas/config.json', () => {
    const projectConfig = {
      ignore: ['vendor/**'],
      ai: { provider: 'mock' }
    };
    fs.writeFileSync(configPath, JSON.stringify(projectConfig));

    const config = loadProjectConfig(testDir);
    expect(config.ignore).toEqual(['vendor/**']);
    expect(config.ai?.provider).toBe('mock');
  });

  it('should merge defaults when no config is provided', () => {
    const resolved = resolveConfig(testDir);
    expect(resolved.merged.ignore).toEqual(['node_modules/**', '.git/**']);
  });

  it('should prioritize project config over defaults', () => {
    const projectConfig = {
      ignore: ['custom_ignore/**']
    };
    fs.writeFileSync(configPath, JSON.stringify(projectConfig));

    const resolved = resolveConfig(testDir);
    expect(resolved.merged.ignore).toEqual(['custom_ignore/**']);
  });

  it('should prioritize CLI options over project config', () => {
    const projectConfig = {
      ignore: ['custom_ignore/**']
    };
    fs.writeFileSync(configPath, JSON.stringify(projectConfig));

    const resolved = resolveConfig(testDir, { ignore: ['cli_override/**'] });
    expect(resolved.merged.ignore).toEqual(['cli_override/**']);
  });

  it('should throw ConfigError on invalid JSON schema', () => {
    const invalidConfig = {
      ignore: "not_an_array"
    };
    fs.writeFileSync(configPath, JSON.stringify(invalidConfig));

    expect(() => loadProjectConfig(testDir)).toThrow('Invalid project configuration in .codeatlas/config.json');
  });

  it('should throw ConfigError on malformed JSON', () => {
    fs.writeFileSync(configPath, '{ invalid json }');

    expect(() => loadProjectConfig(testDir)).toThrow('Failed to parse .codeatlas/config.json');
  });
});
