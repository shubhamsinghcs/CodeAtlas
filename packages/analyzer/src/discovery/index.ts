import { detectInputType } from './detector';
import { cloneGithubRepository, findGitRoot, getGitCommitHash } from './git';
import { walkRepository } from './walker';
import { DiscoveredRepository, DiscoveryOptions } from './types';

export * from './types';
import { UnsupportedRepositoryError, EmptyRepositoryError } from '@codeatlas/shared';

export async function discoverRepository(
  input: string,
  options: DiscoveryOptions = {},
): Promise<DiscoveredRepository> {
  const inputType = detectInputType(input);

  if (inputType === 'unsupported') {
    throw new UnsupportedRepositoryError(`Unsupported input format: ${input}. Must be a local directory or GitHub URL.`);
  }

  let localPath = input;
  let originalUrl: string | undefined;
  let commitHash: string | undefined;

  if (inputType === 'github_url') {
    originalUrl = input;
    localPath = cloneGithubRepository(input);
    commitHash = getGitCommitHash(localPath);
  } else if (inputType === 'local_git') {
    // Input is already pointing to the repository root
    commitHash = getGitCommitHash(localPath);
  } else if (inputType === 'local_dir') {
    // If it's a local dir, maybe it's inside a git repo?
    const gitRoot = findGitRoot(localPath);
    if (gitRoot) {
      commitHash = getGitCommitHash(gitRoot);
      // We still analyze the 'localPath' as requested,
      // but we note the commit hash of its parent git repo.
    }
  }

  const { files, ignoredCount } = walkRepository(localPath, options.ignoredPaths);

  if (files.length === 0) {
    throw new EmptyRepositoryError('No supported source files were found in the repository.');
  }

  const totalSize = files.reduce((acc, file) => acc + file.size, 0);
  const totalLines = files.reduce((acc, file) => acc + file.lineCount, 0);

  return {
    type: inputType,
    localPath,
    originalUrl,
    commitHash,
    files,
    totalSize,
    totalLines,
    ignoredCount,
  };
}
