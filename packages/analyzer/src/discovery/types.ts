export type InputType = 'local_dir' | 'local_git' | 'github_url' | 'unsupported';

export type Language = 'ts' | 'tsx' | 'js' | 'jsx' | 'mjs' | 'cjs' | 'py';

export interface FileInfo {
  path: string; // Relative to the repository root
  absolutePath: string;
  size: number;
  lineCount: number;
  language: Language;
  isTest: boolean;
}

export interface DiscoveredRepository {
  type: InputType;
  localPath: string; // Absolute path to the analyzed directory
  originalUrl?: string; // For GitHub repositories
  commitHash?: string; // For Git repositories
  files: FileInfo[];
  totalSize: number;
  totalLines: number;
  ignoredCount: number;
}

export interface DiscoveryOptions {
  ignoredPaths?: string[]; // Additional paths to ignore
}
