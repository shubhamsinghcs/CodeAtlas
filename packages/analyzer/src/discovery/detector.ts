import * as fs from 'fs';
import * as path from 'path';
import { InputType } from './types';

export function detectInputType(input: string): InputType {
  // Check if it's a GitHub URL
  if (input.startsWith('https://github.com/') || input.startsWith('git@github.com:')) {
    return 'github_url';
  }

  // If it's a URL but not GitHub, we consider it unsupported for now as per requirements
  if (input.startsWith('http://') || input.startsWith('https://')) {
    return 'unsupported';
  }

  // Assume local path
  const absolutePath = path.resolve(input);

  try {
    const stats = fs.statSync(absolutePath);
    if (!stats.isDirectory()) {
      return 'unsupported'; // We only support directory analysis
    }

    // Check if it's a local git repository
    const gitPath = path.join(absolutePath, '.git');
    if (fs.existsSync(gitPath) && fs.statSync(gitPath).isDirectory()) {
      return 'local_git';
    }

    return 'local_dir';
  } catch {
    // Path doesn't exist or isn't accessible
    return 'unsupported';
  }
}
